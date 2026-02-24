import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateImageForWatch(
  supabaseClient: any,
  watch: any,
  LOVABLE_API_KEY: string
): Promise<{ watchId: string; success: boolean; error?: string }> {
  try {
    console.log(`Generating image for: ${watch.brand} ${watch.model}`);

    const watchDescription = [
      `A photorealistic, high-quality product photograph of a ${watch.brand} ${watch.model} luxury wristwatch`,
      watch.dial_color ? `with a ${watch.dial_color} dial` : '',
      watch.type ? `${watch.type} style watch` : '',
      watch.case_size ? `${watch.case_size} case size` : '',
      watch.movement ? `featuring ${watch.movement} movement` : '',
      'Professional studio lighting, white background, sharp focus, high detail',
      'The watch should be displayed at a slight angle to show the dial and case details',
      'Ultra high resolution, 4K quality product photography',
    ].filter(Boolean).join('. ');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: watchDescription }],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI error for ${watch.id}:`, response.status, errorText);
      return { watchId: watch.id, success: false, error: `AI error: ${response.status}` };
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      return { watchId: watch.id, success: false, error: 'No image generated' };
    }

    // Extract base64 and upload
    const base64Match = imageUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!base64Match) {
      return { watchId: watch.id, success: false, error: 'Invalid image format' };
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${watch.id}_ai.${imageFormat}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('watch-images')
      .upload(fileName, binaryData, {
        contentType: `image/${imageFormat}`,
        upsert: true
      });

    if (uploadError) {
      return { watchId: watch.id, success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('watch-images')
      .getPublicUrl(fileName);

    // Update watch record
    await supabaseClient
      .from('watches')
      .update({ ai_image_url: publicUrlData.publicUrl })
      .eq('id', watch.id);

    console.log(`✓ Generated image for ${watch.brand} ${watch.model}`);
    return { watchId: watch.id, success: true };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error for ${watch.id}:`, msg);
    return { watchId: watch.id, success: false, error: msg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all watches without AI images
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
    
    // Process watches sequentially to avoid rate limits
    for (const watch of watches) {
      const result = await generateImageForWatch(supabaseClient, watch, LOVABLE_API_KEY);
      results.push(result);
      
      // Small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    console.log(`Completed: ${successful} successful, ${failed.length} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${successful} images`,
        processed: watches.length,
        successful,
        failed: failed.length,
        failures: failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Batch generation error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
