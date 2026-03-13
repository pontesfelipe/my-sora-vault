import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  brand: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-\.&']+$/, 'Invalid brand format'),
  modelReference: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s\-\.\/&'()]+$/, 'Invalid model format'),
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
    
    const { brand, modelReference } = parseResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Searching for watch: ${brand} ${modelReference}`);

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
            content: 'You are a watch specification expert. Search for watch information and return ONLY valid JSON without any markdown formatting or explanation.'
          },
          {
            role: 'user',
            content: `Search for this watch: ${brand} ${modelReference}

IMPORTANT: First, search the OFFICIAL BRAND WEBSITE for accurate information. For example:
- For Rolex watches, search rolex.com
- For Omega watches, search omegawatches.com
- For IWC watches, search iwc.com
- For Cartier watches, search cartier.com
- For any brand, search their official website first

After checking the official brand site for retail information, ALSO search the following US-based resale marketplaces for AVERAGE PRE-OWNED PRICES:
- Chrono24.com (largest global marketplace for used watches)
- Bob's Watches (US-based Rolex specialist)
- WatchBox (US pre-owned luxury watches)
- Crown & Caliber (US pre-owned marketplace)

Calculate the average US resale price by aggregating prices from these sources for similar condition pre-owned models.

Return the information in this exact JSON format:
{
  "model": "full model name",
  "dialColor": "one simple color name from this list ONLY: Black, Blue, White, Silver, Gray, Green, Red, Orange, Gold, Bronze, Brown, Beige, Champagne, Cream, Navy, Teal, Burgundy, Yellow, Pink, Purple, Salmon, Anthracite, Mother of Pearl, Skeleton",
  "type": "watch type (e.g., Diver, Chronograph, Pilot, GMT, Dress, Field)",
  "cost": retail price in USD as a number (from official brand site),
  "averageResalePrice": average US pre-owned resale price in USD as a number (from Chrono24, Bob's Watches, WatchBox, Crown & Caliber) or null if not found,
  "caseSize": "case diameter with units (e.g., 41mm, 40mm)",
  "lugToLugSize": "lug to lug measurement with units (e.g., 48mm, 47.5mm)",
  "casebackMaterial": "caseback material (e.g., Stainless Steel, Sapphire Crystal, Titanium)",
  "movement": "movement caliber and type (e.g., Omega Co-Axial Master Chronometer 8800, Rolex Caliber 3235)",
  "hasSapphire": true or false for sapphire crystal
}

Pull retail information specifically from the official brand website first. For resale price, aggregate data from the US marketplace sites listed above. If a specific detail is not available, use null for that field. If you cannot find the watch at all, return: {"error": "Watch not found"}

Important: Return ONLY the JSON object, no markdown formatting or explanation.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Parse the JSON from the AI response
    // Remove markdown code blocks if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const watchData = JSON.parse(jsonStr);

    if (watchData.error) {
      return new Response(
        JSON.stringify({ error: watchData.error }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the response has required fields (optional fields can be null)
    if (!watchData.model || !watchData.dialColor || !watchData.type || !watchData.cost) {
      throw new Error('Incomplete watch data from AI');
    }
    
    // Ensure optional fields are present (can be null)
    watchData.caseSize = watchData.caseSize || null;
    watchData.lugToLugSize = watchData.lugToLugSize || null;
    watchData.casebackMaterial = watchData.casebackMaterial || null;
    watchData.movement = watchData.movement || null;
    watchData.hasSapphire = watchData.hasSapphire !== undefined ? watchData.hasSapphire : null;
    watchData.averageResalePrice = watchData.averageResalePrice || null;

    console.log('Watch data found:', watchData);

    return new Response(
      JSON.stringify(watchData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-watch-info:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to search for watch information'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
