import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  brand: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-\.&']+$/, 'Invalid brand format'),
  model: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s\-\.\/&'()]+$/, 'Invalid model format'),
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
    
    const { brand, model } = parseResult.data;

    // Rate limit: 10 per minute per IP
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const rlResponse = rateLimitResponse(clientIp, "analyze-watch-metadata", corsHeaders, 10, 60_000);
    if (rlResponse) return rlResponse;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Analyzing watch: ${brand} ${model}`);

    const systemPrompt = `You are a watch expert specializing in luxury timepieces. Analyze watches to determine their rarity and historical significance based on production numbers, market availability, and historical context.

For RARITY, consider:
- Production numbers (limited editions, discontinued models)
- Current market availability
- Brand exclusivity
- Special editions or collaborations
Return one of: "common", "uncommon", "rare", "very_rare", "grail"

For HISTORICAL SIGNIFICANCE, consider:
- Historical events (e.g., moon landing, expeditions)
- Technological innovations
- Cultural impact
- Celebrity associations
- Brand milestones
Return one of: "regular", "notable", "historically_significant"

Provide detailed reasoning for your classifications.`;

    const userPrompt = `Analyze this watch and provide rarity and historical significance classifications:

Watch: ${brand} ${model}

Consider:
1. How many pieces were produced? Is it still in production?
2. What is its market availability and demand?
3. Does it have any historical significance? (e.g., worn in significant events, technological firsts, cultural impact)
4. Are there any special features or associations that affect its rarity or historical importance?

Provide your analysis in a structured format.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_watch',
              description: 'Classify a watch based on rarity and historical significance',
              parameters: {
                type: 'object',
                properties: {
                  rarity: {
                    type: 'string',
                    enum: ['common', 'uncommon', 'rare', 'very_rare', 'grail'],
                    description: 'The rarity classification of the watch'
                  },
                  historical_significance: {
                    type: 'string',
                    enum: ['regular', 'notable', 'historically_significant'],
                    description: 'The historical significance of the watch'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Detailed explanation of the classifications'
                  }
                },
                required: ['rarity', 'historical_significance', 'reasoning'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_watch' } }
      }),
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
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to analyze watch metadata');
    }

    const aiResponse = await response.json();
    console.log('AI response:', JSON.stringify(aiResponse, null, 2));

    // Extract tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    console.log(`Analysis complete for ${brand} ${model}:`, result);

    return new Response(
      JSON.stringify({
        rarity: result.rarity,
        historical_significance: result.historical_significance,
        reasoning: result.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-watch-metadata:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
