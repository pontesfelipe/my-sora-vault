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
          {
            role: "system",
            content: "You are a watch image search assistant. Return ONLY a direct image URL (ending in .jpg, .jpeg, .png, or .webp) from a reputable source. No markdown, no explanation, just the URL. If you cannot find one, return the word NONE."
          },
          {
            role: "user",
            content: `Find a high-quality product photo URL of the ${brand} ${model} watch. Look on the official brand website first (e.g., omegawatches.com, rolex.com, iwc.com, panerai.com), then try Hodinkee, Chrono24, or other reputable watch sites. I need a direct link to the image file (jpg/png/webp). Return ONLY the URL, nothing else.`
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('Image search AI error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content || content === 'NONE' || content.length > 2000) {
      console.log('No reference image found via AI search');
      return null;
    }

    // Extract URL if wrapped in markdown or extra text
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)[^\s"'<>]*/i);
    if (urlMatch) {
      console.log('Found reference image URL:', urlMatch[0]);
      return urlMatch[0];
    }

    // Check if the whole content is a valid URL
    if (content.startsWith('http')) {
      console.log('Found reference image URL:', content);
      return content;
    }

    console.log('Could not extract valid image URL from AI response');
    return null;
  } catch (e) {
    console.error('Error searching for reference image:', e);
    return null;
  }
}

// Fetch an image URL and convert to base64 data URI
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    console.log('Fetching reference image from URL:', imageUrl);
    const imgResponse = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchVault/1.0)' }
    });
    if (!imgResponse.ok) {
      console.error('Failed to fetch reference image:', imgResponse.status);
      return null;
    }
    const arrayBuffer = await imgResponse.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Skip if image is too small (likely a placeholder/error)
    if (bytes.length < 5000) {
      console.log('Image too small, likely not a real photo');
      return null;
    }
    
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch (e) {
    console.error('Error fetching reference image:', e);
    return null;
  }
}

// Build the AI prompt for image generation
function buildEditPrompt(brand: string, model: string, dialColor?: string, customPrompt?: string): string {
  return customPrompt || `Based on this watch photo, create a professional studio product photograph. Keep the watch design EXACTLY accurate to the reference - same dial layout, number of subdials, hands, bezel, and case shape. Render it as a clean, professional product shot with: DARK background (deep navy or charcoal black, NOT white), professional studio lighting, sharp focus showing all dial details and text, slight angle to show depth. Frame the watch LARGE filling 80-85% of the image. The watch is a ${brand} ${model}${dialColor ? ` with ${dialColor} dial` : ''}. Make it look like a high-end catalog photo. The watch must be standing UPRIGHT. Ultra high resolution.`;
}

function buildGenerationPrompt(brand: string, model: string, dialColor?: string, type?: string, caseSize?: string, movement?: string, customPrompt?: string): string {
  return customPrompt || [
    `Create a photorealistic product photograph of the exact ${brand} ${model} wristwatch`,
    `It must accurately depict the real ${brand} ${model} - match the actual design, dial layout, bezel, hands, and case shape of this specific model`,
    dialColor ? `The dial color is ${dialColor}` : '',
    type ? `It is a ${type} style watch` : '',
    caseSize ? `Case size: ${caseSize}` : '',
    movement ? `Movement: ${movement}` : '',
    'Professional studio lighting with a DARK background - deep navy or charcoal black, NOT white',
    'The background should be a smooth, dark gradient reminiscent of luxury velvet or suede',
    'The watch must be standing UPRIGHT facing the camera at a slight angle, NOT laying on its side',
    'Frame the watch LARGE in the image - it should fill about 80-85% of the frame with minimal empty space around it',
    'Show the dial face clearly with all markers, indices, and subdials visible',
    'Ultra high resolution, luxury catalog product photography quality',
  ].filter(Boolean).join('. ');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const parseResult = inputSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid input: ' + parseResult.error.errors.map(e => e.message).join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { watchId, brand, model, dialColor, type, caseSize, movement, referenceImageBase64, referenceImageUrl, customPrompt } = parseResult.data;
    
    console.log(`Generating AI image for: ${brand} ${model}`);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Resolve reference image (priority: direct base64 > provided URL > auto-search)
    let resolvedBase64 = referenceImageBase64 || null;

    if (!resolvedBase64 && referenceImageUrl) {
      resolvedBase64 = await fetchImageAsBase64(referenceImageUrl);
    }

    // Auto-search for a reference image if none provided
    if (!resolvedBase64) {
      const foundUrl = await findReferenceImageUrl(brand, model, LOVABLE_API_KEY);
      if (foundUrl) {
        resolvedBase64 = await fetchImageAsBase64(foundUrl);
      }
    }

    // Step 2: Build messages based on whether we have a reference
    let messages: any[];
    let generationMethod: string;

    if (resolvedBase64) {
      generationMethod = 'reference-enhanced';
      console.log('Using reference image for enhanced generation');
      const editPrompt = buildEditPrompt(brand, model, dialColor, customPrompt);
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: editPrompt },
            { type: "image_url", image_url: { url: resolvedBase64 } }
          ]
        }
      ];
    } else {
      generationMethod = 'pure-generation';
      console.log('No reference image found, using pure AI generation');
      const genPrompt = buildGenerationPrompt(brand, model, dialColor, type, caseSize, movement, customPrompt);
      messages = [
        { role: "user", content: genPrompt }
      ];
    }

    // Step 3: Call AI for image generation
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
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits required. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image generated');
    }

    // Step 4: Upload to storage
    const base64Match = imageUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid image format from AI');
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${watchId || crypto.randomUUID()}_ai.${imageFormat}`;
    
    console.log(`Uploading image to storage: ${fileName}`);
    
    const { error: uploadError } = await supabaseClient.storage
      .from('watch-images')
      .upload(fileName, binaryData, {
        contentType: `image/${imageFormat}`,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('watch-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`Image uploaded successfully (${generationMethod}): ${publicUrl}`);

    // Step 5: Update watch record if watchId provided
    if (watchId) {
      const { error: updateError } = await supabaseClient
        .from('watches')
        .update({ ai_image_url: publicUrl })
        .eq('id', watchId);

      if (updateError) {
        console.error('Failed to update watch record:', updateError);
      } else {
        console.log('Watch record updated with AI image URL');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        generationMethod,
        message: 'AI image generated successfully' 
      }),
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
