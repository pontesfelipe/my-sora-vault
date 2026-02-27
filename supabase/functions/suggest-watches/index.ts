import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const watchSchema = z.object({
  brand: z.string().max(100).optional(),
  model: z.string().max(200).optional(),
  dial_color: z.string().max(50).optional(),
  type: z.string().max(50).optional(),
  cost: z.number().optional(),
}).passthrough();

const inputSchema = z.object({
  collection: z.array(watchSchema).max(500).optional(),
  tasteDescription: z.string().max(2000).optional(),
  focusOnGaps: z.boolean().optional(),
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
    
    const { collection, tasteDescription, focusOnGaps } = parseResult.data;

    // Rate limit: 5 per minute per IP
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const rlResponse = rateLimitResponse(clientIp, "suggest-watches", corsHeaders, 5, 60_000);
    if (rlResponse) return rlResponse;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing collection and taste preferences...");

    // Build analysis prompt
    const collectionSummary = collection && collection.length > 0
      ? collection.map((w: any) => 
          `${w.brand} ${w.model} (${w.dial_color}, ${w.type}${w.cost ? `, $${w.cost}` : ''})`
        ).join(', ')
      : "No watches in collection yet";

    const basePrompt = focusOnGaps 
      ? `You are a watch expert specialized in collection building. Analyze this collection to identify gaps and suggest watches that would complement and complete it.

Current Collection: ${collectionSummary}

User's Taste Description: ${tasteDescription || "Not provided - analyze collection patterns only"}

Focus on finding gaps in the collection:
- Missing watch categories (dress, sport, dive, pilot, GMT, chronograph, etc.)
- Missing price ranges (entry luxury, mid-range, high-end)
- Missing dial colors or case materials
- Missing complications or features
- Style gaps (casual, formal, tool watch, etc.)

Suggest 5 specific watches that would fill these gaps and make the collection more well-rounded. Consider:
- What types of watches are missing?
- What occasions or use cases are not covered?
- What brands would add diversity?
- What price points would balance the collection?`
      : `You are a watch expert and enthusiast. Analyze this watch collection and user preferences to suggest 5 watches they would love.

Current Collection: ${collectionSummary}

User's Taste Description: ${tasteDescription || "Not provided - base suggestions on collection patterns only"}

Based on the collection's brands, styles, dial colors, and complications, suggest 5 specific watches with exact model names that would complement this collection. Consider:
- Brand preferences shown in collection
- Dial color preferences
- Watch style preferences (dress, sport, dive, pilot, etc.)
- Price range consistency
- Collection gaps (what's missing?)`;

    const prompt = `${basePrompt}

For each suggestion, provide:
1. Brand name
2. Exact model name
3. Preferred dial color options (be specific, e.g., "Blue sunburst", "Black", "Green")
4. Rank (1-5, with 1 being the highest priority)
5. Brief explanation of ${focusOnGaps ? 'what gap this fills' : 'why this watch fits the collection'}

Format your response as a JSON array with this structure:
[
  {
    "brand": "Brand Name",
    "model": "Exact Model Name",
    "dial_colors": "Color options",
    "rank": 1,
    "notes": "Brief explanation"
  }
]

Return ONLY the JSON array, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a watch expert. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log("AI response:", content);

    // Parse the JSON response
    let suggestions;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI suggestions");
    }

    // Validate suggestions structure
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error("Invalid suggestions format");
    }

    console.log("Successfully generated suggestions:", suggestions);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in suggest-watches function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});