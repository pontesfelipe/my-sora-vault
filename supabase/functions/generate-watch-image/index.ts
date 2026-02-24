import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
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

    // Use custom prompt if provided, otherwise build a generic one
    const watchDescription = customPrompt || [
      `Create a photorealistic product photograph of the exact ${brand} ${model} wristwatch`,
      `It must accurately depict the real ${brand} ${model} - match the actual design, dial layout, bezel, hands, and case shape of this specific model`,
      dialColor ? `The dial color is ${dialColor}` : '',
      type ? `It is a ${type} style watch` : '',
      caseSize ? `Case size: ${caseSize}` : '',
      movement ? `Movement: ${movement}` : '',
      'Professional studio lighting, white background, sharp focus, high detail',
      'The watch must be standing UPRIGHT facing the camera at a slight angle, NOT laying on its side',
      'Show the dial face clearly with all markers, indices, and subdials visible',
      'Ultra high resolution, luxury catalog product photography quality',
    ].filter(Boolean).join('. ');

    let messages: any[];

    // Resolve reference image: direct base64 or fetch from URL
    let resolvedReferenceBase64 = referenceImageBase64;
    if (!resolvedReferenceBase64 && referenceImageUrl) {
      console.log('Fetching reference image from URL:', referenceImageUrl);
      try {
        const imgResponse = await fetch(referenceImageUrl);
        if (imgResponse.ok) {
          const arrayBuffer = await imgResponse.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
          resolvedReferenceBase64 = `data:${contentType};base64,${btoa(binary)}`;
          console.log('Reference image fetched and converted to base64');
        } else {
          console.error('Failed to fetch reference image:', imgResponse.status);
        }
      } catch (e) {
        console.error('Error fetching reference image:', e);
      }
    }

    // If we have a reference image, use it to enhance the generation
    if (resolvedReferenceBase64) {
      console.log('Using reference image for enhanced generation');
      const editPrompt = customPrompt || `Based on this watch photo, create a professional studio product photograph. Keep the watch design EXACTLY accurate to the reference - same dial layout, number of subdials, hands, bezel, and case shape. Render it as a clean, professional product shot with: white background, professional studio lighting, sharp focus showing all dial details and text, slight angle to show depth. The watch is a ${brand} ${model}${dialColor ? ` with ${dialColor} dial` : ''}. Make it look like a high-end catalog photo. The watch must be standing UPRIGHT. Ultra high resolution.`;
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: editPrompt },
            { type: "image_url", image_url: { url: resolvedReferenceBase64 } }
          ]
        }
      ];
    } else {
      messages = [
        {
          role: "user",
          content: customPrompt || watchDescription
        }
      ];
    }

    console.log('Calling Lovable AI for image generation...');
    
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

    // Extract base64 data and upload to storage
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
    console.log(`Image uploaded successfully: ${publicUrl}`);

    // Update the watch record with the AI image URL if watchId provided
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
