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

// ─── SIZE CALIBRATION ───
// All watches must appear the SAME visual size regardless of actual case diameter.
// Calibration reference: IWC Pilot Mark XX (40mm) — this is our "100% standard".
// A 34mm watch still renders at the same visual size. A 46mm watch still renders at the same visual size.
const SIZE_CALIBRATION = [
  'SIZE CALIBRATION (MOST IMPORTANT RULE AFTER ORIENTATION):',
  'Every watch in this catalog MUST appear IDENTICALLY sized. Use the IWC Pilot Mark XX (40mm round case) as the universal size reference',
  'In a 1024×1024 output, the watch case (bezel edge to bezel edge, EXCLUDING strap/bracelet) must measure approximately 580-620 pixels wide and 580-620 pixels tall for round cases',
  'For non-round cases, the longest dimension must be 580-620 pixels',
  'This means the case fills roughly 57-60% of the image width',
  'The strap/bracelet extends beyond this, showing 1-2 links or ~2cm from each lug',
  'Do NOT make smaller watches (e.g. 34mm) appear smaller. Do NOT make larger watches (e.g. 46mm) appear larger. ALL cases render at the SAME pixel size',
  'If you are unsure, err on the side of making the watch LARGER to fill the frame, never smaller',
].join('. ');

// ─── COMPOSITION RULES ───
const COMPOSITION_RULES = [
  '*** ABSOLUTE #1 PRIORITY — ORIENTATION ***: The watch MUST be rendered UPRIGHT and VERTICAL. 12 o\'clock at the TOP, 6 o\'clock at the BOTTOM. The watch must NEVER be lying down, tilted, horizontal, or rotated. If you generate a horizontal/laying watch, the output is INVALID and REJECTED',
  'SQUARE 1:1 aspect ratio composition',
  'The watch must be PERFECTLY CENTERED in the frame, both horizontally and vertically',
  SIZE_CALIBRATION,
  'STRAIGHT-ON front-facing view looking directly at the dial face — absolutely NO side angles, NO wrist shots',
  'Maximum 3-5 degree tilt for minimal depth perception — the full dial must be completely visible and readable',
  'For rectangular watches, long axis must be vertical, crown at 3 o\'clock side, no 90-degree rotation',
  'The watch hands must be set to the 10:10 position',
  'Show a small portion of the bracelet/strap extending from both lugs (about 1-2 links or 2cm of strap)',
  'DARK background: smooth gradient from charcoal (#2a2a2a) at edges to near-black (#111111) at center',
  'Professional studio lighting: soft diffused main light from upper-left, subtle fill light from right',
  'Sharp focus on entire dial face — every index, hand, and subdial must be crisp and legible',
  'No reflections on crystal, no glare spots, no watermarks, no text overlays',
  'Ultra high resolution, photorealistic, luxury catalog quality',
].join('. ');

const isLikelyBase64 = (value: string) => {
  const compact = value.replace(/\s+/g, '');
  return /^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 128;
};

const normalizeReferenceImage = (rawImage: string) => {
  const image = rawImage.trim();
  if (image.startsWith('data:image/')) return image;
  if (isLikelyBase64(image)) return `data:image/jpeg;base64,${image.replace(/\s+/g, '')}`;
  return image;
};

// ─── IDENTITY PROFILES ───
// Hard-coded constraints for models the AI frequently gets wrong.
type IdentityProfile = {
  officialName: string;
  requiredElements: string;
  forbiddenElements: string;
};

function getIdentityProfile(brand: string, model: string, type?: string): IdentityProfile | null {
  const brandLc = brand.toLowerCase();
  const modelLc = normalizeModelForSearch(model).toLowerCase();
  const typeLc = (type || '').toLowerCase();

  if (brandLc.includes('casio') && modelLc.includes('databank')) {
    return {
      officialName: 'Casio Databank',
      requiredElements: 'Rectangular digital LCD face with segmented numerals, multi-button layout on front face (typical calculator-style keypad), compact resin case, resin or stainless steel strap, Casio branding on dial, classic retro 1980s-1990s digital watch aesthetic, silver-tone or dark resin case',
      forbiddenElements: 'NO analog hands, NO round case, NO dive bezel, NO chronograph subdials, NO smart-watch touchscreen UI, NO large modern smartwatch form factor',
    };
  }

  if (brandLc.includes('breitling') && modelLc.includes('navitimer') && (modelLc.includes('gmt') || typeLc.includes('gmt'))) {
    return {
      officialName: 'Breitling Navitimer GMT 41',
      requiredElements: 'Navitimer slide-rule bezel architecture, GMT hand, date window, aviation dial language matching Navitimer GMT edition',
      forbiddenElements: 'NO chronograph pushers, NO tri-compax chronograph subdials, NO diver bezel, NO fantasy oversized case',
    };
  }

  if ((brandLc.includes('swatch') || brandLc.includes('omega')) && modelLc.includes('moonswatch')) {
    const editionMatch = model.match(/[""\u201C\u201D]([^""\u201C\u201D]+)[""\u201C\u201D]/);
    const editionName = editionMatch?.[1] || model.replace(/.*moonswatch\s*/i, '').trim();
    return {
      officialName: `Omega x Swatch MoonSwatch Mission to ${editionName || 'the Planet'}`,
      requiredElements: 'Bioceramic case material (matte plastic-ceramic blend), Speedmaster Moonwatch-inspired round case shape, tachymeter scale on bezel ring, THREE chronograph subdials in tri-compax layout (running seconds at 9, 30-minute counter at 3, 12-hour counter at 6), applied Omega logo on dial, SWATCH text on dial, matching planet-themed colorway for the specific edition, velcro strap or matching bioceramic bracelet',
      forbiddenElements: 'NO polished metal case, NO sapphire crystal, NO exhibition caseback, NO leather strap, NO generic Speedmaster without Swatch co-branding, NO wrong planet color scheme',
    };
  }

  // Oris Big Crown — prevent mixing with ProPilot
  if (brandLc.includes('oris') && modelLc.includes('big crown') && !modelLc.includes('propilot') && !modelLc.includes('pro pilot')) {
    return {
      officialName: `Oris Big Crown ${model.replace(/big\s*crown\s*/i, '').trim() || 'Pointer Date'}`,
      requiredElements: 'Oris Big Crown collection design: classic pilot/aviation style, coin-edge bezel, prominent oversized crown, pointer date hand (if Pointer Date variant), clean aviation-style dial, applied indices or Arabic numerals, Oris logo at 12',
      forbiddenElements: 'NO ProPilot design elements, NO modern sporty case, NO integrated bracelet, NO non-existent limited edition names, NO fantasy model names that don\'t exist in Oris catalog',
    };
  }

  return null;
}

function buildIdentityConstraint(profile: IdentityProfile | null): string {
  if (!profile) return '';
  return [
    `EXACT IDENTITY: ${profile.officialName}`,
    `MUST INCLUDE: ${profile.requiredElements}`,
    `MUST NOT INCLUDE: ${profile.forbiddenElements}`,
  ].join('. ');
}

// ─── HELPERS ───
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

function buildDetailCues(opts: { dialColor?: string; type?: string; caseSize?: string; movement?: string; bezelType?: string; strapType?: string; specialEditionHint?: string }): string {
  return [
    opts.specialEditionHint ? `Edition hint: ${opts.specialEditionHint}` : '',
    opts.dialColor ? `Dial color/finish MUST match exactly: ${opts.dialColor}` : '',
    opts.type ? `Complication/category cues: ${opts.type}` : '',
    opts.caseSize ? `Case size cue: ${opts.caseSize}` : '',
    opts.strapType ? `Strap type cue: ${opts.strapType}` : '',
    opts.movement ? `Movement cue: ${opts.movement}` : '',
    opts.bezelType ? `Bezel cue: ${opts.bezelType}` : '',
  ].filter(Boolean).join('. ');
}

// ─── PROMPT BUILDERS ───

function buildUserPhotoEnhancementPrompt(
  brand: string,
  model: string,
  opts: { dialColor?: string; type?: string; caseSize?: string; movement?: string; bezelType?: string; strapType?: string; specialEditionHint?: string },
  identityProfile: IdentityProfile | null
): string {
  const canonicalModel = canonicalizeModelForPrompt(brand, model);
  const cues = buildDetailCues(opts);
  const identity = buildIdentityConstraint(identityProfile);

  return [
    `USER PHOTO ENHANCEMENT: The attached image is a real photograph of a ${brand} ${canonicalModel} taken by the owner. Use this photo as the AUTHORITATIVE visual reference for EXACTLY what this watch looks like — its dial, hands, indices, bezel, bracelet/strap, case shape, and all details`,
    `STRICT EDIT MODE: Do NOT redesign, reinterpret, restyle, or morph the watch. Keep case geometry, lug shape, crown side, dial layout, marker count, hand shape, and bezel markings EXACTLY as in the source photo`,
    `YOUR TASK: Transform this user photo into a professional, clean STUDIO PRODUCT SHOT. Only change the PRESENTATION:`,
    `- Remove the background and replace with a dark studio gradient`,
    `- Correct the orientation so the watch is PERFECTLY UPRIGHT (12 o'clock at top)`,
    `- Remove any wrist, arm, table, or surface — show only the watch`,
    `- Apply clean, even studio lighting`,
    `- Set hands to 10:10 if they are in a significantly different position`,
    `*** CRITICAL ZOOM/SIZE OVERRIDE ***: Do NOT preserve the original photo's framing distance. IGNORE how close or far the camera was. You MUST ZOOM IN or ENLARGE the watch so the case (bezel edge to bezel edge, excluding strap) measures approximately 580-620 pixels in a 1024x1024 output — roughly 57-60% of image width. Use the IWC Pilot Mark XX (40mm) as the universal size standard. ALL watches must appear this SAME size regardless of their actual case diameter. If the source photo shows the watch small or far away, you MUST dramatically enlarge it`,
    cues,
    identity,
    `COMPOSITION: ${COMPOSITION_RULES}`,
  ].filter(Boolean).join('. ');
}

function buildReferencePrompt(
  brand: string,
  model: string,
  opts: { dialColor?: string; type?: string; caseSize?: string; movement?: string; bezelType?: string; strapType?: string; specialEditionHint?: string },
  identityProfile: IdentityProfile | null
): string {
  const canonicalModel = canonicalizeModelForPrompt(brand, model);
  const cues = buildDetailCues(opts);
  const identity = buildIdentityConstraint(identityProfile);

  return [
    'IMPORTANT: Use reference image(s) ONLY to identify design details (dial layout, hand style, bezel markings, bracelet pattern, crown shape)',
    'Do NOT copy framing, zoom level, angle, or proportions from references',
    `Never output a generic watch; this must be recognizably the exact ${brand} ${canonicalModel}`,
    cues,
    identity,
    `This is a ${brand} ${canonicalModel}`,
    `CRITICAL OVERRIDE - IGNORE REFERENCE IMAGE FRAMING: ${COMPOSITION_RULES}`,
  ].filter(Boolean).join('. ');
}

function buildPureGenerationPrompt(
  brand: string,
  model: string,
  opts: { dialColor?: string; type?: string; caseSize?: string; movement?: string; bezelType?: string; strapType?: string; specialEditionHint?: string },
  identityProfile: IdentityProfile | null
): string {
  const canonicalModel = canonicalizeModelForPrompt(brand, model);
  const cues = buildDetailCues(opts);
  const identity = buildIdentityConstraint(identityProfile);

  return [
    `Create an ACCURATE photorealistic product photograph of the exact ${brand} ${canonicalModel} wristwatch`,
    'This must look like a real catalog product photo taken by a professional photographer in a studio',
    'Render the exact real-world edition/reference when identifiable; avoid generic lookalikes',
    `The watch MUST be recognizably a ${brand} ${canonicalModel} - get the dial layout, hand style, bezel, case shape, and branding exactly right`,
    cues,
    identity,
    COMPOSITION_RULES,
  ].filter(Boolean).join('. ');
}

// ─── IMAGE EXTRACTION ───
function extractGeneratedImageUrlFromResponse(data: any): string | null {
  const message = data?.choices?.[0]?.message;
  if (!message) return null;

  const directCandidates = [
    message?.images?.[0]?.image_url?.url,
    message?.images?.[0]?.url,
    message?.images?.[0]?.image_url,
    message?.image_url?.url,
    message?.image_url,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);

  if (directCandidates.length > 0) return directCandidates[0];

  const content = message?.content;
  if (typeof content === 'string') {
    const dataUrlMatch = content.match(/data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+/i);
    if (dataUrlMatch?.[0]) return dataUrlMatch[0];
  }

  if (Array.isArray(content)) {
    for (const part of content) {
      const partCandidates = [
        part?.image_url?.url,
        part?.image_url,
        part?.url,
      ].filter((v): v is string => typeof v === 'string' && v.length > 0);

      const direct = partCandidates.find((u) => u.startsWith('data:image/') || /^https?:\/\//i.test(u));
      if (direct) return direct;
    }
  }

  return null;
}

// ─── REFERENCE IMAGE FETCH (user-provided URLs only) ───
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    let candidateUrl = imageUrl;
    if (!/\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(candidateUrl)) {
      try {
        const resp = await fetch(candidateUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchVault/1.0)' } });
        if (resp.ok) {
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.toLowerCase().includes('text/html')) {
            const html = await resp.text();
            const metaMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
              || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
            if (metaMatch?.[1]) candidateUrl = new URL(metaMatch[1], candidateUrl).toString();
          }
        }
      } catch { /* ignore */ }
    }

    const resp = await fetch(candidateUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchVault/1.0)' } });
    if (!resp.ok) return null;
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/')) return null;

    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length < 5000 || bytes.length > 15_000_000) return null;

    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${ct};base64,${btoa(binary)}`;
  } catch { return null; }
}

// ─── MAIN HANDLER ───
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
      watchId, brand, model, dialColor, type, caseSize, movement,
      bezelType, strapType, specialEditionHint,
      referenceImageBase64, referenceImageUrl, customPrompt,
    } = parseResult.data;

    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const rlResponse = rateLimitResponse(clientIp, "generate-watch-image", corsHeaders, 5, 60_000);
    if (rlResponse) return rlResponse;

    console.log(`Generating AI image for: ${brand} ${model} (dial: ${dialColor || 'unspecified'})`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─── IDENTITY PROFILE (prevents wrong watch types) ───
    const identityProfile = getIdentityProfile(brand, model, type);

    // ─── REFERENCE IMAGES: Only user-provided, NO AI URL search ───
    // The AI reference search was hallucinating URLs and fetching wrong images,
    // causing the generated output to not match the actual watch.
    let referenceImages: string[] = [];
    let referenceSource: 'provided-url' | 'uploaded-photo' | 'none' = 'none';

    console.log('Reference payload received', {
      hasReferenceImageBase64: Boolean(referenceImageBase64),
      referenceImageBase64Length: referenceImageBase64?.length || 0,
      hasReferenceImageUrl: Boolean(referenceImageUrl),
    });

    const normalizedUploadedReference = referenceImageBase64 ? normalizeReferenceImage(referenceImageBase64) : null;

    if (normalizedUploadedReference?.startsWith('data:image/')) {
      referenceImages = [normalizedUploadedReference];
      referenceSource = 'uploaded-photo';
      console.log('Using uploaded photo as reference');
    } else if (referenceImageBase64) {
      console.warn('Uploaded reference image was provided but not in a supported format; falling back to URL/pure generation');
    }

    if (referenceImages.length === 0 && referenceImageUrl) {
      const fromProvidedUrl = await fetchImageAsBase64(referenceImageUrl);
      if (fromProvidedUrl) {
        referenceImages = [fromProvidedUrl];
        referenceSource = 'provided-url';
      }
    }

    if (referenceImages.length > 0) {
      console.log(`Reference source: ${referenceSource} (${referenceImages.length} image(s))`);
    }

    // ─── BUILD SYSTEM MESSAGE ───
    // Use identity-specific system message when available, otherwise generic
    const identitySystemMessage = identityProfile
      ? {
          role: "system",
          content: [
            `You are generating a product photo of EXACTLY ${identityProfile.officialName}.`,
            `MUST INCLUDE: ${identityProfile.requiredElements}.`,
            `MUST NOT INCLUDE: ${identityProfile.forbiddenElements}.`,
            "You are a professional watch product photography AI. You generate STANDARDIZED catalog images.",
            "MANDATORY OUTPUT RULES (violation = rejected image):",
            "1. ORIENTATION: Watch MUST be UPRIGHT — 12 o'clock at TOP, 6 o'clock at BOTTOM. NEVER tilted, horizontal, or laying flat.",
            "2. SIZE (CRITICAL): The watch case (bezel edge to bezel edge, EXCLUDING strap) must measure approximately 580-620 pixels wide in a 1024×1024 image (~57-60% of frame width). Use the IWC Pilot Mark XX (40mm) as the calibration standard — ALL watches render at this SAME pixel size regardless of real-world diameter. A 34mm watch and a 46mm watch must appear the SAME size.",
            "3. CENTERING: Watch must be PERFECTLY centered horizontally and vertically.",
            "4. ASPECT: Output MUST be square (1:1).",
            "5. VIEW: Straight-on front-facing ONLY.",
            "6. HANDS: Set to 10:10 position.",
            "7. STRAP: Show 1-2 links or ~2cm of strap from both lugs.",
            "8. BACKGROUND: Smooth dark gradient (#2a2a2a edges to #111 center). NO props.",
            "9. LIGHTING: Professional studio — soft diffused main light upper-left, fill from right. NO harsh reflections.",
            "10. QUALITY: Ultra-high resolution, photorealistic, luxury catalog quality.",
          ].join("\n"),
        }
      : {
          role: "system",
          content: [
            "You are a professional watch product photography AI. You generate STANDARDIZED catalog images.",
            "MANDATORY OUTPUT RULES (violation = rejected image):",
            "1. ORIENTATION: Watch MUST be UPRIGHT — 12 o'clock at TOP, 6 o'clock at BOTTOM. NEVER tilted, horizontal, or laying flat.",
            "2. SIZE: The watch case (excluding strap) MUST fill exactly 55-65% of image width and 45-55% of image height. ALL watches must appear the SAME visual size.",
            "3. CENTERING: Watch must be PERFECTLY centered horizontally and vertically.",
            "4. ASPECT: Output MUST be square (1:1).",
            "5. VIEW: Straight-on front-facing ONLY.",
            "6. HANDS: Set to 10:10 position.",
            "7. STRAP: Show 1-2 links or ~2cm of strap from both lugs.",
            "8. BACKGROUND: Smooth dark gradient (#2a2a2a edges to #111 center). NO props.",
            "9. LIGHTING: Professional studio — soft diffused main light upper-left, fill from right. NO harsh reflections.",
            "10. QUALITY: Ultra-high resolution, photorealistic, luxury catalog quality.",
            "Think of this as producing images for a STANDARDIZED watch database where every image must be visually consistent.",
          ].join("\n"),
        };

    // ─── BUILD MESSAGES ───
    let messages: any[];
    let generationMethod: string;

    if (referenceImages.length > 0) {
      generationMethod = referenceSource === 'uploaded-photo' ? 'photo-enhancement' : 'reference-enhanced';
      console.log(`Using reference image for ${generationMethod} (${referenceSource})`);

      let prompt: string;
      if (customPrompt) {
        prompt = customPrompt;
      } else if (referenceSource === 'uploaded-photo') {
        prompt = buildUserPhotoEnhancementPrompt(brand, model, {
          dialColor, type, caseSize, movement, bezelType, strapType, specialEditionHint,
        }, identityProfile);
      } else {
        prompt = buildReferencePrompt(brand, model, {
          dialColor, type, caseSize, movement, bezelType, strapType, specialEditionHint,
        }, identityProfile);
      }

      messages = [
        identitySystemMessage,
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...referenceImages.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ];
    } else {
      generationMethod = 'pure-generation';
      console.log('No reference image, using pure AI generation');

      const prompt = customPrompt || buildPureGenerationPrompt(brand, model, {
        dialColor, type, caseSize, movement, bezelType, strapType, specialEditionHint,
      }, identityProfile);

      messages = [
        identitySystemMessage,
        { role: "user", content: prompt },
      ];
    }

    // Use the pro model for ALL generation methods for better quality and size consistency
    const imageModel = 'google/gemini-3-pro-image-preview';

    console.log(`Calling AI (method: ${generationMethod}, model: ${imageModel})...`);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageModel,
        messages,
        modalities: ["image", "text"],
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
    const imageUrl = extractGeneratedImageUrlFromResponse(data);
    if (!imageUrl) {
      console.error('No image in AI response', {
        topLevelKeys: Object.keys(data || {}),
        messageKeys: Object.keys(data?.choices?.[0]?.message || {}),
      });
      throw new Error('No image generated');
    }

    // ─── UPLOAD TO STORAGE ───
    const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    let binaryData: Uint8Array;
    let imageFormat: 'png' | 'jpeg' | 'webp' = 'png';

    if (base64Match) {
      const rawFormat = base64Match[1].toLowerCase();
      imageFormat = rawFormat === 'jpg' ? 'jpeg' : (rawFormat as 'png' | 'jpeg' | 'webp');
      binaryData = Uint8Array.from(atob(base64Match[2]), c => c.charCodeAt(0));
    } else if (/^https?:\/\//i.test(imageUrl)) {
      const fetchedImage = await fetch(imageUrl);
      if (!fetchedImage.ok) throw new Error(`Generated image URL fetch failed: ${fetchedImage.status}`);
      const fetchedType = (fetchedImage.headers.get('content-type') || '').toLowerCase();
      if (!fetchedType.startsWith('image/')) throw new Error('Generated image URL did not return an image');
      if (fetchedType.includes('webp')) imageFormat = 'webp';
      else if (fetchedType.includes('jpeg') || fetchedType.includes('jpg')) imageFormat = 'jpeg';
      binaryData = new Uint8Array(await fetchedImage.arrayBuffer());
    } else {
      throw new Error('Invalid image format from AI');
    }

    const fileName = `${watchId || crypto.randomUUID()}_ai.${imageFormat}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('watch-images')
      .upload(fileName, binaryData, { contentType: `image/${imageFormat}`, upsert: true });

    if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

    const { data: publicUrlData } = supabaseClient.storage.from('watch-images').getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    if (watchId) {
      await supabaseClient.from('watches').update({ ai_image_url: publicUrl }).eq('id', watchId);
      console.log('Watch record updated with AI image URL');
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl, generationMethod, referenceCount: referenceImages.length, message: 'AI image generated successfully' }),
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
