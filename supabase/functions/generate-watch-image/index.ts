import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  watchId: z.string().uuid().optional(),
  brand: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-\.&']+$/, 'Invalid brand format'),
  model: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s\-\.\/&'(),:]+$/, 'Invalid model format'),
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
// These prompts enforce uniform composition across ALL watches:
// - Exact same framing, angle, proportions, and background
// - Dial color is ALWAYS explicitly mentioned and enforced
// - Watch fills exactly 75% of a square frame, perfectly centered
// - Straight-on front view, 0-5° tilt max
// - Dark gradient background (charcoal to near-black)

const COMPOSITION_RULES = [
  'SQUARE 1:1 aspect ratio composition',
  'The watch must be PERFECTLY CENTERED in the frame, both horizontally and vertically',
  'CRITICAL SIZE RULE: Regardless of the actual case diameter of the watch, ALL watches must appear the SAME visual size in the image - the watch case (excluding strap) must fill exactly 60% of the image width and 50% of the image height. This is a normalized catalog view where a 44mm Panerai and a 40mm IWC must look the same size in the frame',
  'STRAIGHT-ON front-facing view looking directly at the dial face - absolutely NO side angles',
  'Maximum 3-5 degree tilt for minimal depth perception - the full dial must be completely visible and readable',
  'The watch must be UPRIGHT with 12 o\'clock at the top',
  'Show a small portion of the bracelet/strap extending from both lugs (about 1-2 links or 2cm of strap)',
  'DARK background: smooth gradient from charcoal (#2a2a2a) at edges to near-black (#111111) at center',
  'Professional studio lighting: soft diffused main light from upper-left, subtle fill light from right',
  'Sharp focus on entire dial face - every index, hand, and subdial must be crisp',
  'No reflections on crystal, no glare spots',
  'Ultra high resolution, photorealistic, luxury catalog quality',
].join('. ');

function buildReferencePrompt(
  brand: string,
  model: string,
  opts: { dialColor?: string; type?: string; caseSize?: string; movement?: string; bezelType?: string; strapType?: string; specialEditionHint?: string }
): string {
  const specificCues = [
    opts.dialColor ? `Dial color/finish MUST match exactly: ${opts.dialColor}` : '',
    opts.type ? `Complication/category cues: ${opts.type}` : '',
    opts.caseSize ? `Case size target: ${opts.caseSize}` : '',
    opts.movement ? `Movement cue: ${opts.movement}` : '',
    opts.bezelType ? `Bezel cue: ${opts.bezelType}` : '',
    opts.strapType ? `Bracelet/strap cue: ${opts.strapType}` : '',
    opts.specialEditionHint ? `Edition/reference cue: ${opts.specialEditionHint}` : '',
  ].filter(Boolean).join('. ');

  return `IMPORTANT: Use the reference image ONLY to identify design details (dial layout, hand style, bezel markings, bracelet pattern, crown shape). Do NOT copy the framing, zoom level, angle, or proportions from the reference photo. Never output a generic or placeholder-style watch; it must be recognizably the exact ${brand} ${model} reference with accurate dial layout, bezel markings, hand set, indices, crown, and bracelet/strap architecture. Instead, generate a completely new studio product shot following these STRICT composition rules. This is a ${brand} ${model}. ${specificCues}. CRITICAL OVERRIDE - IGNORE THE REFERENCE IMAGE'S FRAMING: ${COMPOSITION_RULES}`;
}

function buildPureGenerationPrompt(
  brand: string,
  model: string,
  opts: { dialColor?: string; type?: string; caseSize?: string; movement?: string; bezelType?: string; strapType?: string; specialEditionHint?: string }
): string {
  const details = [
    `Create an ACCURATE photorealistic product photograph of the ${brand} ${model} wristwatch`,
    opts.dialColor ? `Dial color/finish MUST be: ${opts.dialColor}` : 'Dial color must match the real production model',
    opts.type ? `Complication/category: ${opts.type}` : '',
    opts.caseSize ? `Case diameter cue: ${opts.caseSize}` : '',
    opts.movement ? `Movement cue: ${opts.movement}` : '',
    opts.bezelType ? `Bezel cue: ${opts.bezelType}` : '',
    opts.strapType ? `Bracelet/strap cue: ${opts.strapType}` : '',
    opts.specialEditionHint ? `Edition/reference cue: ${opts.specialEditionHint}` : '',
    `Render the exact real-world reference/edition when identifiable; avoid generic lookalikes`,
    COMPOSITION_RULES,
  ].filter(Boolean);
  return details.join('. ');
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
            content: "You are a watch reference image hunter. Return ONLY ONE URL. Prioritize official product pages and direct official image URLs for the EXACT reference/edition requested. If possible return a direct image URL; otherwise return the official product page URL containing hero images. No markdown, no commentary, no extra text. If not found, return NONE."
          },
          {
            role: "user",
            content: `Find the best official reference image for the EXACT watch edition: ${brand} ${searchModel}. Match dial color, bezel style, bracelet type, and complications.`
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
    console.log(`Generating AI image for: ${brand} ${model} (dial: ${dialColor || 'unspecified'})`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve reference image with quality priority: explicit URL > official model search > uploaded photo
    let resolvedBase64: string | null = null;
    let referenceSource: 'provided-url' | 'official-search' | 'uploaded-photo' | 'none' = 'none';

    if (referenceImageUrl) {
      const fromProvidedUrl = await fetchImageAsBase64(referenceImageUrl);
      if (fromProvidedUrl) {
        resolvedBase64 = fromProvidedUrl;
        referenceSource = 'provided-url';
      }
    }

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

    if (!resolvedBase64 && referenceImageBase64) {
      resolvedBase64 = referenceImageBase64;
      referenceSource = 'uploaded-photo';
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
