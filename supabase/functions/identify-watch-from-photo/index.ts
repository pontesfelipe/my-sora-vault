import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema - limit image payload to ~10MB
const inputSchema = z.object({
  image: z.string().min(1).max(15000000, 'Image too large (max 10MB)'),
  excluded_suggestions: z.array(z.object({
    brand: z.string(),
    model: z.string(),
  })).optional().default([]),
});

const isLikelyBase64 = (value: string) => {
  const compact = value.replace(/\s+/g, '');
  return /^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 128;
};

const normalizeImageForGateway = (rawImage: string) => {
  const image = rawImage.trim();

  if (image.startsWith('data:image/')) return image;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;

  // Support legacy callers that send only raw base64
  if (isLikelyBase64(image)) {
    return `data:image/jpeg;base64,${image.replace(/\s+/g, '')}`;
  }

  return image;
};

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
    
    const { image, excluded_suggestions } = parseResult.data;
    const normalizedImage = normalizeImageForGateway(image);
    if (!(normalizedImage.startsWith('data:image/') || normalizedImage.startsWith('http://') || normalizedImage.startsWith('https://'))) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format. Please upload a valid image.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit by IP (no auth on this endpoint): 10 per minute
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const rlResponse = rateLimitResponse(clientIp, "identify-watch-from-photo", corsHeaders, 10, 60_000);
    if (rlResponse) return rlResponse;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Identifying watch from photo...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a world-class watch identification expert with encyclopedic knowledge of every watch brand, reference number, and edition ever produced — from mainstream luxury (Rolex, Omega, Breitling, etc.) to microbrands and vintage pieces. You must identify not just the general model line but the EXACT reference/edition. Pay close attention to: dial color and texture, bezel type and markings (GMT, tachymeter, dive scale), bracelet/strap type and material, subdial layout, hand style, crown guards, case shape, lume plot pattern, date window position, and any text/logos on the dial. Distinguish between standard editions, limited editions, special editions, anniversary models, and regional variants. Always provide the most specific reference number you can determine. IMPORTANT: If you are given a list of previously rejected identifications, do NOT repeat any of those — look more carefully at distinguishing features and suggest a DIFFERENT identification.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Identify this watch with maximum specificity. I need the EXACT edition and reference number, not just the model line. Analyze: 1) Dial color and finish (sunburst, matte, lacquer, fumé, etc.) 2) Bezel type (ceramic, aluminum, fixed, rotating, GMT, tachymeter, countdown) 3) Bracelet/strap (oyster, jubilee, president, NATO, leather, rubber, mesh, specific endlink style) 4) Complications visible (GMT, chronograph, moonphase, date, day-date, annual calendar) 5) Case details (material, polished vs brushed, crown guards, case shape) 6) Any special edition markers (engravings, unique colorways, anniversary text, collaboration branding). For example: not just "Rolex Submariner" but "Rolex Submariner Date 126610LN with black ceramic bezel and Oyster bracelet". Not just "Omega Speedmaster" but "Omega Speedmaster Professional Moonwatch 310.30.42.50.01.001 hesalite crystal".${excluded_suggestions.length > 0 ? `\n\nIMPORTANT: The user has REJECTED the following previous identifications as WRONG. Do NOT suggest any of these again. Look more carefully at distinguishing details and provide a DIFFERENT identification:\n${excluded_suggestions.map((s: any, i: number) => `${i + 1}. ${s.brand} ${s.model}`).join('\n')}` : ''}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: normalizedImage
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'identify_watch',
              description: 'Identify watch details from a photo',
              parameters: {
                type: 'object',
                properties: {
                  brand: {
                    type: 'string',
                    description: 'The watch brand name (e.g., Rolex, Omega, Seiko)'
                  },
                  model: {
                    type: 'string',
                    description: 'The complete model name and reference number if visible'
                  },
                  dial_color: {
                    type: 'string',
                    description: 'The color of the watch dial (e.g., Black, Blue, White, Silver)'
                  },
                  type: {
                    type: 'string',
                    description: 'The watch type/category (e.g., Diver, Chronograph, GMT, Dress, Pilot, Field)'
                  },
                  case_size: {
                    type: 'string',
                    description: 'The case diameter if identifiable (e.g., 40mm, 42mm)'
                  },
                  movement: {
                    type: 'string',
                    description: 'Movement type if known (e.g., Automatic, Manual, Quartz)'
                  },
                  case_material: {
                    type: 'string',
                    description: 'Case material if identifiable (e.g., Stainless Steel, Gold, Titanium, Bronze)'
                  },
                  bezel_type: {
                    type: 'string',
                    description: 'Bezel type if visible (e.g., Ceramic, Aluminum, Fixed, Rotating)'
                  },
                  strap_type: {
                    type: 'string',
                    description: 'Strap/bracelet type (e.g., Metal Bracelet, Leather, NATO, Rubber)'
                  },
                  case_shape: {
                    type: 'string',
                    description: 'Case shape (e.g., Round, Tonneau, Rectangular, Cushion, Square, Octagonal)'
                  },
                  complications: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of ALL watch complications/functions visible or known for this model. Include every applicable one from: GMT, Chronograph, Date, Day-Date, Annual Calendar, Perpetual Calendar, Moonphase, Power Reserve, Minute Repeater, Tourbillon, World Time, Flyback, Tachymeter, Alarm, Small Seconds, Split-Seconds. Be thorough.'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Confidence level of the identification'
                  },
                  notes: {
                    type: 'string',
                    description: 'Additional observations, distinguishing features, or uncertainties about the identification'
                  }
                },
                required: ['brand', 'model', 'dial_color', 'type', 'confidence', 'complications'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'identify_watch' } }
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
      let gatewayMessage = `AI gateway error: ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        gatewayMessage = parsed?.error?.message || parsed?.error || gatewayMessage;
      } catch {
        if (errorText) gatewayMessage = errorText.slice(0, 500);
      }

      console.error('AI Gateway error:', response.status, gatewayMessage);
      return new Response(
        JSON.stringify({ error: gatewayMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const watchInfo = JSON.parse(toolCall.function.arguments);
    console.log('Identified watch:', watchInfo);

    return new Response(
      JSON.stringify(watchInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error identifying watch:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
