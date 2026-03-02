import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  watchId: z.string().uuid().optional(),
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(200),
  dialColor: z.string().max(50).optional(),
  type: z.string().max(50).optional(),
  caseSize: z.string().max(20).optional(),
  movement: z.string().max(100).optional(),
  bezelType: z.string().max(120).optional(),
  strapType: z.string().max(120).optional(),
  specialEditionHint: z.string().max(500).optional(),
  referenceImageBase64: z.string().max(15000000, 'Image too large (max 10MB)').optional(),
  referenceImageUrl: z.string().url().max(2000).optional(),
  customPrompt: z.string().max(2000).optional(),
});

// ─── STANDARDIZED PROMPT SYSTEM ───
// Well-known brands get detailed accuracy prompts; lesser-known/microbrands
// get simpler attribute-driven prompts to avoid hallucinated details.

const KNOWN_BRANDS = new Set([
  'rolex', 'omega', 'patek philippe', 'audemars piguet', 'cartier',
  'iwc', 'jaeger-lecoultre', 'vacheron constantin', 'breitling', 'tudor',
  'tag heuer', 'longines', 'tissot', 'seiko', 'grand seiko', 'citizen',
  'casio', 'g-shock', 'hamilton', 'oris', 'zenith', 'panerai', 'hublot',
  'bulgari', 'bvlgari', 'chopard', 'blancpain', 'breguet', 'girard-perregaux',
  'ulysse nardin', 'a. lange & söhne', 'a. lange & sohne', 'glashutte original',
  'nomos', 'montblanc', 'bell & ross', 'richard mille', 'sinn', 'junghans',
  'frederique constant', 'rado', 'mido', 'certina', 'orient', 'bulova',
  'movado', 'raymond weil', 'maurice lacroix', 'franck muller', 'jacob & co',
  'piaget', 'harry winston', 'roger dubuis', 'corum', 'baume & mercier',
  'ap', 'jlc', 'pp', 'vc', 'gp',
]);

function isKnownBrand(brand: string): boolean {
  return KNOWN_BRANDS.has(brand.trim().toLowerCase());
}

function shouldReuseExistingImage(opts: {
  brand: string;
  referenceImageBase64?: string;
  referenceImageUrl?: string;
  customPrompt?: string;
  specialEditionHint?: string;
}): boolean {
  // Reuse only for well-known brands and only when no custom/reference context exists.
  // This prevents propagating low-quality legacy images for microbrands (e.g. Trafford).
  if (!isKnownBrand(opts.brand)) return false;
  if (opts.referenceImageBase64 || opts.referenceImageUrl) return false;
  if (opts.customPrompt || opts.specialEditionHint) return false;
  return true;
}

const COMPOSITION_RULES = [
  'SQUARE 1:1 aspect ratio composition',
  'The watch must be PERFECTLY CENTERED in the frame, both horizontally and vertically',
  'CRITICAL SIZE RULE: Regardless of the actual case diameter, ALL watches must appear the SAME visual size — the case (excluding strap) fills exactly 60% of image width and 50% of image height',
  'STRAIGHT-ON front-facing view looking directly at the dial face — absolutely NO side angles, NO wrist shots',
  'Maximum 3-5 degree tilt for minimal depth perception — the full dial must be completely visible and readable',
  'ORIENTATION LOCK: 12 o\'clock marker must be at the top; watch must be upright and NEVER sideways or rotated 90°',
  'The watch must be UPRIGHT with 12 o\'clock at the top, hands set to 10:10 position',
  'Show a small portion of the bracelet/strap extending from both lugs (about 1-2 links or 2cm of strap)',
  'DARK background: smooth gradient from charcoal (#2a2a2a) at edges to near-black (#111111) at center',
  'Professional studio lighting: soft diffused main light from upper-left, subtle fill light from right',
  'Sharp focus on entire dial face — every index, hand, and subdial must be crisp and legible',
  'No reflections on crystal, no glare spots, no watermarks, no text overlays',
  'Ultra high resolution, photorealistic, luxury catalog quality',
].join('. ');

function buildReferencePrompt(
  brand: string,
  model: string,
  opts: { dialColor?: string; type?: string; caseSize?: string; movement?: string; bezelType?: string; strapType?: string; specialEditionHint?: string }
): string {
  const canonicalModel = canonicalizeModelForPrompt(brand, model);
  const known = isKnownBrand(brand);

  const specificCues = [
    opts.dialColor ? `CRITICAL — Dial color/finish MUST be exactly: ${opts.dialColor}. This is non-negotiable` : '',
    opts.type ? `Watch type/complication: ${opts.type}` : '',
    opts.caseSize ? `Case diameter: ${opts.caseSize}` : '',
    opts.movement ? `Movement type: ${opts.movement}` : '',
    opts.bezelType ? `Bezel style: ${opts.bezelType}` : '',
    opts.strapType ? `Bracelet/strap: ${opts.strapType}` : '',
    opts.specialEditionHint ? `Special edition/reference: ${opts.specialEditionHint}` : '',
  ].filter(Boolean).join('. ');

  if (known) {
    return [
      `REFERENCE IMAGE INSTRUCTIONS: Study the reference image carefully to extract EXACT design DNA — dial layout, indices style, hand shapes, subdial positions, bezel markings, crown design, bracelet/strap pattern, case shape, and any text printed on the dial.`,
      `Do NOT copy the reference image's framing, angle, zoom, lighting, or background. Generate a COMPLETELY NEW studio product shot.`,
      `WATCH IDENTITY: This is a ${brand} ${canonicalModel}. The generated image MUST be unmistakably recognizable as this specific model.`,
      `KEY ACCURACY REQUIREMENTS: The dial must show the correct brand logo/name placement, correct number and style of subdials (if any), correct hand shapes specific to this model, correct bezel insert markings (if applicable), and correct bracelet/strap design.`,
      specificCues,
      `COMPOSITION: ${COMPOSITION_RULES}`,
    ].filter(Boolean).join('. ');
  }

  // Microbrand / lesser-known: rely heavily on reference image, don't hallucinate details
  return [
    `REFERENCE IMAGE INSTRUCTIONS: This is a ${brand} ${canonicalModel} — a lesser-known or independent brand. CLOSELY REPLICATE the watch shown in the reference image since AI training data is unlikely to contain this model.`,
    `Copy the dial layout, hand style, index pattern, case shape, bezel design, and bracelet/strap from the reference as faithfully as possible. Match the overall aesthetic and proportions.`,
    `Do NOT invent or hallucinate design details not visible in the reference image.`,
    specificCues,
    `Generate a clean studio product shot with these rules: ${COMPOSITION_RULES}`,
  ].filter(Boolean).join('. ');
}

function buildPureGenerationPrompt(
  brand: string,
  model: string,
  opts: { dialColor?: string; type?: string; caseSize?: string; movement?: string; bezelType?: string; strapType?: string; specialEditionHint?: string }
): string {
  const canonicalModel = canonicalizeModelForPrompt(brand, model);
  const known = isKnownBrand(brand);

  const attrCues = [
    opts.dialColor ? `Dial color/finish: ${opts.dialColor}` : '',
    opts.type ? `Watch type: ${opts.type}` : '',
    opts.caseSize ? `Case diameter: ${opts.caseSize}` : '',
    opts.movement ? `Movement: ${opts.movement}` : '',
    opts.bezelType ? `Bezel: ${opts.bezelType}` : '',
    opts.strapType ? `Bracelet/strap: ${opts.strapType}` : '',
    opts.specialEditionHint ? `Edition details: ${opts.specialEditionHint}` : '',
  ].filter(Boolean).join('. ');

  if (known) {
    const details = [
      `Create a HIGHLY ACCURATE photorealistic product photograph of the ${brand} ${canonicalModel} wristwatch`,
      `ACCURACY IS PARAMOUNT: The image must be unmistakably recognizable as the ${brand} ${canonicalModel} — not a generic watch or a different model from the same brand`,
      `DIAL DETAILS: Reproduce the correct brand logo position, model name text on dial (if the real watch has it), correct number/layout of subdials, correct index style (applied, printed, Arabic, Roman, baton, dot), correct hand design specific to this model`,
      opts.dialColor ? `CRITICAL — Dial color/finish MUST be exactly: ${opts.dialColor}` : 'Dial color must precisely match the real production model',
      opts.type ? `Watch type/complication: ${opts.type}` : '',
      opts.caseSize ? `Case diameter: ${opts.caseSize}` : '',
      opts.movement ? `Movement type: ${opts.movement}` : '',
      opts.bezelType ? `Bezel style: ${opts.bezelType} — reproduce exact markings, scale, and insert color` : '',
      opts.strapType ? `Bracelet/strap: ${opts.strapType} — match link shape, clasp style, and finishing` : '',
      opts.specialEditionHint ? `Special edition/reference: ${opts.specialEditionHint}` : '',
      `CASE & CROWN: Match the correct case shape, lug design, crown shape and guards (if applicable) for this specific model`,
      `Render the exact real-world reference/edition; absolutely NO generic lookalikes or amalgamations of different models`,
      COMPOSITION_RULES,
    ].filter(Boolean);
    return details.join('. ');
  }

  // Microbrand / lesser-known: generate a clean, plausible watch using only provided attributes
  return [
    `Create a photorealistic product photograph of a wristwatch by ${brand}, model "${canonicalModel}"`,
    `This is an independent/microbrand watch — do NOT try to reproduce specific details from memory. Instead, create a clean, believable, high-quality watch design using ONLY the attributes provided below`,
    `Print "${brand}" as the brand name on the dial in a tasteful position. Print "${canonicalModel}" as a secondary text if space allows`,
    attrCues,
    `Design a visually appealing, coherent watch that matches these attributes. Keep the design simple, elegant, and realistic — avoid over-complicated or fantasy elements`,
    COMPOSITION_RULES,
  ].filter(Boolean).join('. ');
}

// Try to find a reference image URL for a watch using AI web search
function normalizeModelForSearch(model: string): string {
  return model
    .replace(/\(likely[^)]*\)/gi, '')
    .replace(/\(reference[^)]*\)/gi, '')
    .replace(/\([^)]*generation[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeModelForPrompt(brand: string, model: string): string {
  const normalizedBrand = brand.trim().toLowerCase();
  const cleanedModel = normalizeModelForSearch(model);

  return cleanedModel
    .replace(new RegExp(`^${normalizedBrand}\\s+`, 'i'), '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findReferenceImageUrl(brand: string, model: string, LOVABLE_API_KEY: string): Promise<string | null> {
  try {
    const searchModel = normalizeModelForSearch(model);
    console.log(`Searching for reference image: ${brand} ${searchModel}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a watch reference image hunter. Return ONLY ONE URL. Prioritize official brand product pages or direct official studio product image URLs for the EXACT reference/edition requested. Strongly prefer front-facing catalog shots that clearly show dial layout, bezel text, and bracelet architecture. Avoid marketplace listings, user photos, wrist shots, and lifestyle/editorial images. If possible return a direct image URL; otherwise return the official product page URL containing hero images. No markdown, no commentary, no extra text. If not found, return NONE."
          },
          {
            role: "user",
            content: `Find the best official reference image for the EXACT watch edition: ${brand} ${searchModel}. Must match dial color, bezel style, bracelet type, and complications; prioritize a straight-on product shot.`
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content === 'NONE' || content.length > 2000) return null;

    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+/i);
    return urlMatch ? urlMatch[0] : null;
  } catch {
    return null;
  }
}

async function resolveImageUrlFromHtmlPage(pageUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchVault/1.0)' } });
    if (!resp.ok) return null;

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('text/html')) return null;

    const html = await resp.text();
    const metaMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    if (!metaMatch?.[1]) return null;
    return new URL(metaMatch[1], pageUrl).toString();
  } catch {
    return null;
  }
}

async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    let candidateUrl = imageUrl;

    // If AI returns a webpage URL, try to extract og:image first
    if (!/\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(candidateUrl)) {
      const extracted = await resolveImageUrlFromHtmlPage(candidateUrl);
      if (extracted) candidateUrl = extracted;
    }

    const resp = await fetch(candidateUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchVault/1.0)' } });
    if (!resp.ok) return null;

    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/')) return null;

    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length < 5000) return null;

    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

    return `data:${ct};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parseResult = inputSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: ' + parseResult.error.errors.map(e => e.message).join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      watchId,
      brand,
      model,
      dialColor,
      type,
      caseSize,
      movement,
      bezelType,
      strapType,
      specialEditionHint,
      referenceImageBase64,
      referenceImageUrl,
      customPrompt,
    } = parseResult.data;
    // Rate limit: 5 per minute per IP (image gen is expensive)
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const rlResponse = rateLimitResponse(clientIp, "generate-watch-image", corsHeaders, 5, 60_000);
    if (rlResponse) return rlResponse;

    console.log(`Generating AI image for: ${brand} ${model} (dial: ${dialColor || 'unspecified'})`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─── CHECK FOR EXISTING IMAGE FROM ANOTHER USER'S COLLECTION ───
    // Reuse is intentionally restricted to avoid recycling bad legacy outputs
    // for microbrands or custom/reference-driven requests.
    const allowImageReuse = shouldReuseExistingImage({
      brand,
      referenceImageBase64,
      referenceImageUrl,
      customPrompt,
      specialEditionHint,
    });

    if (allowImageReuse) {
      const normalizedBrand = brand.trim().toLowerCase();
      const normalizedModel = model.trim().toLowerCase();
      const normalizedDialColor = (dialColor || '').trim().toLowerCase();

      const { data: existingMatches } = await supabaseClient
        .from('watches')
        .select('id, ai_image_url, brand, model, dial_color')
        .not('ai_image_url', 'is', null)
        .eq('status', 'active')
        .limit(50);

      if (existingMatches && existingMatches.length > 0) {
        const match = existingMatches.find((w: any) => {
          const wb = (w.brand || '').trim().toLowerCase();
          const wm = (w.model || '').trim().toLowerCase();
          const wd = (w.dial_color || '').trim().toLowerCase();
          // Exact match on brand + model + dial color (or both have no dial color)
          return wb === normalizedBrand && wm === normalizedModel &&
            (wd === normalizedDialColor || (!wd && !normalizedDialColor));
        });

        if (match && match.ai_image_url) {
          // Skip watchId check — only reuse from a DIFFERENT watch record
          if (!watchId || match.id !== watchId) {
            console.log(`Reusing existing AI image from watch ${match.id} for ${brand} ${model}`);

            // Update the current watch record with the existing image
            if (watchId) {
              await supabaseClient.from('watches').update({ ai_image_url: match.ai_image_url }).eq('id', watchId);
            }

            return new Response(
              JSON.stringify({
                success: true,
                imageUrl: match.ai_image_url,
                generationMethod: 'reused-existing',
                message: `Reused existing AI image from another collection`,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    } else {
      console.log(`Skipping image reuse for ${brand} ${model} to force fresh generation`);
    }

    // Resolve reference image with quality priority:
    // - If user uploaded a photo, use it DIRECTLY (skip slow AI reference search)
    // - Otherwise: explicit URL > official model search > none
    let resolvedBase64: string | null = null;
    let referenceSource: 'provided-url' | 'official-search' | 'uploaded-photo' | 'none' = 'none';

    if (referenceImageBase64) {
      // User already uploaded a photo — use it directly, no need for expensive search
      resolvedBase64 = referenceImageBase64;
      referenceSource = 'uploaded-photo';
      console.log('Using uploaded photo as reference (skipping reference search for speed)');
    } else if (referenceImageUrl) {
      const fromProvidedUrl = await fetchImageAsBase64(referenceImageUrl);
      if (fromProvidedUrl) {
        resolvedBase64 = fromProvidedUrl;
        referenceSource = 'provided-url';
      }
    }

    // Only do the slow AI reference search if no reference image available yet
    if (!resolvedBase64) {
      const foundUrl = await findReferenceImageUrl(brand, model, LOVABLE_API_KEY);
      if (foundUrl) {
        const fromOfficialSearch = await fetchImageAsBase64(foundUrl);
        if (fromOfficialSearch) {
          resolvedBase64 = fromOfficialSearch;
          referenceSource = 'official-search';
        }
      }
    }

    if (resolvedBase64) {
      console.log(`Reference source selected: ${referenceSource}`);
    }

    // Build messages with standardized prompts
    let messages: any[];
    let generationMethod: string;

    if (resolvedBase64) {
      generationMethod = 'reference-enhanced';
      console.log(`Using reference image for enhanced generation (${referenceSource})`);
      const prompt = customPrompt || buildReferencePrompt(brand, model, {
        dialColor,
        type,
        caseSize,
        movement,
        bezelType,
        strapType,
        specialEditionHint,
      });
      messages = [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: resolvedBase64 } }] }];
    } else {
      generationMethod = 'pure-generation';
      console.log('No reference image found, using pure AI generation');
      const prompt = customPrompt || buildPureGenerationPrompt(brand, model, {
        dialColor,
        type,
        caseSize,
        movement,
        bezelType,
        strapType,
        specialEditionHint,
      });
      messages = [{ role: "user", content: prompt }];
    }

    // Call AI for image generation
    console.log(`Calling AI (method: ${generationMethod})...`);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages,
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits required. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) throw new Error('No image generated');

    // Upload to storage
    const base64Match = imageUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!base64Match) throw new Error('Invalid image format from AI');

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const fileName = `${watchId || crypto.randomUUID()}_ai.${imageFormat}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('watch-images')
      .upload(fileName, binaryData, { contentType: `image/${imageFormat}`, upsert: true });

    if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

    const { data: publicUrlData } = supabaseClient.storage.from('watch-images').getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    // Update watch record if watchId provided
    if (watchId) {
      await supabaseClient.from('watches').update({ ai_image_url: publicUrl }).eq('id', watchId);
      console.log('Watch record updated with AI image URL');
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl, generationMethod, message: 'AI image generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating watch image:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
