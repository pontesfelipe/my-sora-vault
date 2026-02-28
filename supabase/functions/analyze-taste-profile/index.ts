import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: 5 per minute per user
    const rlResponse = rateLimitResponse(user.id, "analyze-taste-profile", corsHeaders, 5, 60_000);
    if (rlResponse) return rlResponse;

    // Fetch all relevant data in parallel
    const [watchesResult, wearResult, tripsResult, eventsResult] = await Promise.all([
      supabaseClient.from('watches').select('*').eq('user_id', user.id),
      supabaseClient.from('wear_entries').select('*, watches(brand, model, type)').eq('user_id', user.id),
      supabaseClient.from('trips').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(20),
      supabaseClient.from('events').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(20),
    ]);

    const watches = watchesResult.data || [];
    const wearEntries = wearResult.data || [];
    const trips = tripsResult.data || [];
    const events = eventsResult.data || [];

    if (watches.length === 0) {
      return new Response(JSON.stringify({ 
        tasteProfile: "No watches in collection yet. Add some watches to generate a taste profile." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build collection summary
    const collectionSummary = watches.map((w: any) => 
      `${w.brand} ${w.model} (${w.dial_color}, ${w.type}${w.cost ? `, $${w.cost}` : ''})`
    ).join('; ');

    // Build personal notes summary
    const notesInfo = watches
      .filter((w: any) => w.why_bought || w.what_i_like || w.what_i_dont_like)
      .map((w: any) => {
        const parts = [];
        if (w.why_bought) parts.push(`Why bought: ${w.why_bought}`);
        if (w.what_i_like) parts.push(`Likes: ${w.what_i_like}`);
        if (w.what_i_dont_like) parts.push(`Dislikes: ${w.what_i_dont_like}`);
        return `${w.brand} ${w.model}: ${parts.join('. ')}`;
      }).join('\n');

    // Build purchase timeline summary
    const purchaseInfo = watches
      .filter((w: any) => w.when_bought)
      .sort((a: any, b: any) => new Date(b.when_bought).getTime() - new Date(a.when_bought).getTime())
      .slice(0, 10)
      .map((w: any) => `${w.brand} ${w.model} purchased ${w.when_bought}${w.cost ? ` for $${w.cost}` : ''}`)
      .join('; ');

    // Build wear patterns summary
    const wearCounts: Record<string, number> = {};
    wearEntries.forEach((entry: any) => {
      if (entry.watches) {
        const key = `${entry.watches.brand} ${entry.watches.model}`;
        wearCounts[key] = (wearCounts[key] || 0) + (entry.days || 1);
      }
    });
    const sortedWear = Object.entries(wearCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const wearSummary = sortedWear.length > 0 
      ? sortedWear.map(([watch, days]) => `${watch}: ${days} days`).join('; ')
      : 'No wear data recorded';

    // Build travel summary with watch associations
    const tripSummary = trips.length > 0
      ? trips.slice(0, 10).map((t: any) => {
          const watchInfo = t.watch_model ? ` with ${JSON.stringify(t.watch_model)}` : '';
          return `${t.location} (${t.purpose})${watchInfo}`;
        }).join('; ')
      : 'No travel data';

    // Build events summary with watch associations
    const eventSummary = events.length > 0
      ? events.slice(0, 10).map((e: any) => {
          const watchInfo = e.watch_model ? ` with ${JSON.stringify(e.watch_model)}` : '';
          return `${e.purpose} at ${e.location}${watchInfo}`;
        }).join('; ')
      : 'No event data';

    // Analyze price range
    const costs = watches.filter((w: any) => w.cost).map((w: any) => w.cost);
    const priceRange = costs.length > 0 
      ? `$${Math.min(...costs).toLocaleString()} - $${Math.max(...costs).toLocaleString()}`
      : 'Unknown';
    const avgCost = costs.length > 0 
      ? Math.round(costs.reduce((a: number, b: number) => a + b, 0) / costs.length)
      : 0;

    // Analyze brand distribution
    const brandCounts: Record<string, number> = {};
    watches.forEach((w: any) => {
      brandCounts[w.brand] = (brandCounts[w.brand] || 0) + 1;
    });
    const topBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([brand, count]) => `${brand} (${count})`)
      .join(', ');

    // Analyze dial colors
    const colorCounts: Record<string, number> = {};
    watches.forEach((w: any) => {
      if (w.dial_color) colorCounts[w.dial_color] = (colorCounts[w.dial_color] || 0) + 1;
    });
    const topColors = Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([color, count]) => `${color} (${count})`)
      .join(', ');

    // Analyze watch types
    const typeCounts: Record<string, number> = {};
    watches.forEach((w: any) => {
      if (w.type) typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => `${type} (${count})`)
      .join(', ');

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a watch expert analyzing a collector's preferences. Based on the following comprehensive data about their watch collection and behavior, write a detailed 2-3 paragraph description of their taste preferences that could be used to suggest new watches.

COLLECTION OVERVIEW (${watches.length} watches):
${collectionSummary}

BRAND DISTRIBUTION: ${topBrands}
DIAL COLOR PREFERENCES: ${topColors}
WATCH TYPE PREFERENCES: ${topTypes}
PRICE RANGE: ${priceRange} (average: $${avgCost.toLocaleString()})

WEAR PATTERNS (most worn watches):
${wearSummary}

PURCHASE HISTORY:
${purchaseInfo || 'No purchase dates recorded'}

PERSONAL NOTES & OPINIONS:
${notesInfo || 'No personal notes recorded'}

TRAVEL HISTORY (watches worn on trips):
${tripSummary}

SPECIAL EVENTS (watches worn to events):
${eventSummary}

Based on all this data, write a comprehensive taste profile describing:
1. Their preferred watch styles and categories
2. Brand affinities and price range preferences
3. Dial color and material preferences
4. What occasions they collect for (based on travel/events)
5. What they seem to value most (based on wear patterns and personal notes)

Write in first person as if the collector is describing their own taste. Be specific and reference actual patterns from the data. Keep it to 2-3 paragraphs, around 150-200 words total.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a watch expert helping collectors understand their taste preferences." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const tasteProfile = aiResponse.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ tasteProfile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error analyzing taste profile:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
