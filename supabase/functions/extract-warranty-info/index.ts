import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit: 10 per minute per IP
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const rlResponse = rateLimitResponse(clientIp, "extract-warranty-info", corsHeaders, 10, 60_000);
    if (rlResponse) return rlResponse;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Extracting warranty information from image...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting information from warranty cards and watch documentation. Extract all relevant warranty information from the provided image.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract warranty information from this warranty card image. Return the data in JSON format.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_warranty_info',
              description: 'Extract warranty information from a warranty card image',
              parameters: {
                type: 'object',
                properties: {
                  warranty_date: {
                    type: 'string',
                    description: 'The warranty start date in YYYY-MM-DD format'
                  },
                  brand: {
                    type: 'string',
                    description: 'The watch brand name'
                  },
                  model: {
                    type: 'string',
                    description: 'The watch model name or reference number'
                  },
                  serial_number: {
                    type: 'string',
                    description: 'The serial number if visible'
                  },
                  warranty_period: {
                    type: 'string',
                    description: 'The warranty period (e.g., "2 years", "5 years")'
                  },
                  retailer: {
                    type: 'string',
                    description: 'The authorized dealer or retailer name'
                  },
                  additional_info: {
                    type: 'string',
                    description: 'Any other relevant information from the warranty card'
                  }
                },
                required: ['warranty_date'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_warranty_info' } }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage quota exceeded. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const warrantyInfo = JSON.parse(toolCall.function.arguments);
    console.log('Extracted warranty info:', warrantyInfo);

    return new Response(
      JSON.stringify(warrantyInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting warranty info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
