import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── STANDARDIZED PROMPT SYSTEM (must match generate-watch-image) ───
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

async function findReferenceImageUrl(brand: string, model: string, LOVABLE_API_KEY: string): Promise<string | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
    if (!content || content === 'NONE') return null;
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)[^\s"'<>]*/i);
    return urlMatch ? urlMatch[0] : content.startsWith('http') ? content : null;
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

async function generateImageForWatch(
  supabaseClient: any, watch: any, LOVABLE_API_KEY: string
): Promise<{ watchId: string; success: boolean; error?: string }> {
  try {
    console.log(`Generating image for: ${watch.brand} ${watch.model} (dial: ${watch.dial_color || 'unspecified'})`);

    let referenceBase64: string | null = null;
    const foundUrl = await findReferenceImageUrl(watch.brand, watch.model, LOVABLE_API_KEY);
    if (foundUrl) referenceBase64 = await fetchImageAsBase64(foundUrl);

    let messages: any[];
    if (referenceBase64) {
      console.log(`Using reference image for ${watch.brand} ${watch.model}`);
      messages = [{ role: "user", content: [
        { type: "text", text: buildReferencePrompt(watch.brand, watch.model, watch.dial_color) },
        { type: "image_url", image_url: { url: referenceBase64 } }
      ]}];
    } else {
      console.log(`No reference found for ${watch.brand} ${watch.model}, using pure generation`);
      messages = [{ role: "user", content: buildPureGenerationPrompt(watch.brand, watch.model, watch.dial_color, watch.type, watch.case_size, watch.movement) }];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-pro-image-preview", messages, modalities: ["image", "text"] }),
    });

    if (!response.ok) {
      return { watchId: watch.id, success: false, error: `AI error: ${response.status}` };
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) return { watchId: watch.id, success: false, error: 'No image generated' };

    const base64Match = imageUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!base64Match) return { watchId: watch.id, success: false, error: 'Invalid image format' };

    const imageFormat = base64Match[1];
    const binaryData = Uint8Array.from(atob(base64Match[2]), c => c.charCodeAt(0));
    const fileName = `${watch.id}_ai.${imageFormat}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('watch-images').upload(fileName, binaryData, { contentType: `image/${imageFormat}`, upsert: true });

    if (uploadError) return { watchId: watch.id, success: false, error: uploadError.message };

    const { data: publicUrlData } = supabaseClient.storage.from('watch-images').getPublicUrl(fileName);
    await supabaseClient.from('watches').update({ ai_image_url: publicUrlData.publicUrl }).eq('id', watch.id);

    console.log(`✓ Generated image for ${watch.brand} ${watch.model}`);
    return { watchId: watch.id, success: true };
  } catch (error) {
    return { watchId: watch.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: watches, error: fetchError } = await supabaseClient
      .from('watches')
      .select('id, brand, model, dial_color, type, case_size, movement')
      .is('ai_image_url', null)
      .order('brand', { ascending: true });

    if (fetchError) throw fetchError;
    if (!watches || watches.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No watches need image generation', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${watches.length} watches...`);
    const results: { watchId: string; success: boolean; error?: string }[] = [];

    for (const watch of watches) {
      const result = await generateImageForWatch(supabaseClient, watch, LOVABLE_API_KEY);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    return new Response(
      JSON.stringify({ success: true, message: `Generated ${successful} images`, processed: watches.length, successful, failed: failed.length, failures: failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
