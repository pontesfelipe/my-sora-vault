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
  model: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s\-\.\/&'()]+$/, 'Invalid model format'),
  dialColor: z.string().max(50).optional(),
  type: z.string().max(50).optional(),
  caseSize: z.string().max(20).optional(),
  movement: z.string().max(100).optional(),
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
  'The watch (including lugs and bracelet/strap visible portion) must fill exactly 75% of the image height',
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

function buildReferencePrompt(brand: string, model: string, dialColor?: string): string {
  return `IMPORTANT: Recreate this EXACT watch as a studio product photo. This is a ${brand} ${model}${dialColor ? ` with a ${dialColor} dial - the dial color MUST be ${dialColor}, this is critical` : ''}. Keep EVERY design detail identical to the reference: dial layout, subdial positions, hand styles, bezel markings, case shape, crown, and pushers. ${COMPOSITION_RULES}`;
}

function buildPureGenerationPrompt(brand: string, model: string, dialColor?: string, type?: string, caseSize?: string, movement?: string): string {
  const details = [
    `Create an ACCURATE photorealistic product photograph of the ${brand} ${model} wristwatch`,
    `The dial color is ${dialColor || 'as per the original model'} - this MUST be accurately depicted`,
    type ? `Watch style: ${type}` : '',
    caseSize ? `Case diameter: ${caseSize}` : '',
    movement ? `Movement type: ${movement}` : '',
    `Research and accurately depict the real ${brand} ${model}: correct number of subdials, correct bezel style, correct hand design, correct hour markers`,
    COMPOSITION_RULES,
  ].filter(Boolean);
  return details.join('. ');
}

// Try to find a reference image URL for a watch using AI web search
async function findReferenceImageUrl(brand: string, model: string, LOVABLE_API_KEY: string): Promise<string | null> {
  try {
    console.log(`Searching for reference image: ${brand} ${model}`);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a watch image search assistant. Return ONLY a direct image URL (ending in .jpg, .jpeg, .png, or .webp) from a reputable source. No markdown, no explanation, just the URL. If you cannot find one, return the word NONE." },
          { role: "user", content: `Find a high-quality product photo URL of the ${brand} ${model} watch. Look on the official brand website first, then Hodinkee, Chrono24, or other reputable watch sites. Return ONLY the URL.` }
        ],
        temperature: 0.2,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content === 'NONE' || content.length > 2000) return null;
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)[^\s"'<>]*/i);
    if (urlMatch) return urlMatch[0];
    return content.startsWith('http') ? content : null;
  } catch { return null; }
}

async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchVault/1.0)' } });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length < 5000) return null;
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    return `data:${ct};base64,${btoa(binary)}`;
  } catch { return null; }
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

    const { watchId, brand, model, dialColor, type, caseSize, movement, referenceImageBase64, referenceImageUrl, customPrompt } = parseResult.data;
    console.log(`Generating AI image for: ${brand} ${model} (dial: ${dialColor || 'unspecified'})`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve reference image: direct base64 > provided URL > auto-search
    let resolvedBase64 = referenceImageBase64 || null;
    if (!resolvedBase64 && referenceImageUrl) {
      resolvedBase64 = await fetchImageAsBase64(referenceImageUrl);
    }
    if (!resolvedBase64) {
      const foundUrl = await findReferenceImageUrl(brand, model, LOVABLE_API_KEY);
      if (foundUrl) resolvedBase64 = await fetchImageAsBase64(foundUrl);
    }

    // Build messages with standardized prompts
    let messages: any[];
    let generationMethod: string;

    if (resolvedBase64) {
      generationMethod = 'reference-enhanced';
      console.log('Using reference image for enhanced generation');
      const prompt = customPrompt || buildReferencePrompt(brand, model, dialColor);
      messages = [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: resolvedBase64 } }] }];
    } else {
      generationMethod = 'pure-generation';
      console.log('No reference image found, using pure AI generation');
      const prompt = customPrompt || buildPureGenerationPrompt(brand, model, dialColor, type, caseSize, movement);
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
