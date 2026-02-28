import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 20 messages per minute
    const rlResponse = rateLimitResponse(user.id, "vault-pal-chat", corsHeaders, 20, 60_000);
    if (rlResponse) return rlResponse;

    const { messages, collectionId, collectionType } = await req.json() as {
      messages: ChatMessage[];
      collectionId?: string;
      collectionType?: string;
    };

    // Fetch all collection data in parallel
    const [
      watchesResult,
      wearEntriesResult,
      tripsResult,
      eventsResult,
      sportsResult,
      waterUsageResult,
      wishlistResult,
      watchSpecsResult,
      sneakerSpecsResult,
      purseSpecsResult,
      insightsResult,
      preferencesResult,
    ] = await Promise.all([
      supabaseClient
        .from("watches")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true }),
      supabaseClient
        .from("wear_entries")
        .select("*, watches(brand, model, type, dial_color)")
        .eq("user_id", user.id)
        .order("wear_date", { ascending: false })
        .limit(1000),
      supabaseClient
        .from("trips")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })
        .limit(50),
      supabaseClient
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })
        .limit(50),
      supabaseClient
        .from("sports")
        .select("*")
        .eq("user_id", user.id)
        .order("activity_date", { ascending: false })
        .limit(50),
      supabaseClient
        .from("water_usage")
        .select("*, watches(brand, model)")
        .eq("user_id", user.id)
        .order("activity_date", { ascending: false })
        .limit(50),
      supabaseClient
        .from("wishlist")
        .select("*")
        .eq("user_id", user.id)
        .order("rank", { ascending: true }),
      supabaseClient.from("watch_specs").select("*").eq("user_id", user.id),
      supabaseClient.from("sneaker_specs").select("*").eq("user_id", user.id),
      supabaseClient.from("purse_specs").select("*").eq("user_id", user.id),
      supabaseClient
        .from("collection_insights")
        .select("insights")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseClient
        .from("user_preferences")
        .select("taste_description")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const watches = watchesResult.data || [];
    const wearEntries = wearEntriesResult.data || [];
    const trips = tripsResult.data || [];
    const events = eventsResult.data || [];
    const sports = sportsResult.data || [];
    const waterUsage = waterUsageResult.data || [];
    const wishlist = wishlistResult.data || [];
    const watchSpecs = watchSpecsResult.data || [];
    const sneakerSpecs = sneakerSpecsResult.data || [];
    const purseSpecs = purseSpecsResult.data || [];
    const collectionInsights = insightsResult.data?.insights || "";
    const tastePreferences = preferencesResult.data?.taste_description || "";

    // Build comprehensive context
    const collectionLabel = collectionType === "sneakers" ? "sneakers" : 
                            collectionType === "purses" ? "purses" : "watches";

    // Collection summary
    const collectionSummary = watches.map((w: any) => {
      const parts = [`${w.brand} ${w.model}`];
      if (w.dial_color) parts.push(`(${w.dial_color})`);
      if (w.type) parts.push(`- ${w.type}`);
      if (w.cost) parts.push(`- $${w.cost.toLocaleString()}`);
      if (w.rarity) parts.push(`[${w.rarity}]`);
      return parts.join(" ");
    }).join("\n");

    // Personal notes for each item
    const personalNotes = watches
      .filter((w: any) => w.why_bought || w.what_i_like || w.what_i_dont_like || w.sentiment)
      .map((w: any) => {
        const notes = [`${w.brand} ${w.model}:`];
        if (w.why_bought) notes.push(`  Why bought: ${w.why_bought}`);
        if (w.what_i_like) notes.push(`  Likes: ${w.what_i_like}`);
        if (w.what_i_dont_like) notes.push(`  Dislikes: ${w.what_i_dont_like}`);
        if (w.sentiment) notes.push(`  Overall sentiment: ${w.sentiment}`);
        return notes.join("\n");
      }).join("\n\n");

    // Wear log summary
    const wearCounts: Record<string, { count: number; recentDates: string[] }> = {};
    wearEntries.forEach((entry: any) => {
      if (entry.watches) {
        const key = `${entry.watches.brand} ${entry.watches.model}`;
        if (!wearCounts[key]) wearCounts[key] = { count: 0, recentDates: [] };
        wearCounts[key].count += entry.days || 1;
        if (wearCounts[key].recentDates.length < 3) {
          wearCounts[key].recentDates.push(entry.wear_date);
        }
      }
    });
    const wearSummary = Object.entries(wearCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([watch, data]) => `${watch}: ${data.count} days worn (recent: ${data.recentDates.join(", ")})`)
      .join("\n");

    // Trips summary
    const tripsSummary = trips.map((t: any) => 
      `${t.start_date}: ${t.location} (${t.purpose}) - ${t.days} days${t.notes ? ` - Notes: ${t.notes}` : ""}`
    ).join("\n");

    // Events summary
    const eventsSummary = events.map((e: any) =>
      `${e.start_date}: ${e.purpose} at ${e.location} (${e.days} days)`
    ).join("\n");

    // Sports summary
    const sportsSummary = sports.map((s: any) =>
      `${s.activity_date}: ${s.sport_type}${s.location ? ` at ${s.location}` : ""} - ${s.duration_minutes || "?"} min${s.notes ? ` - ${s.notes}` : ""}`
    ).join("\n");

    // Water usage summary
    const waterSummary = waterUsage.map((w: any) =>
      `${w.activity_date}: ${w.activity_type} with ${w.watches?.brand} ${w.watches?.model}${w.depth_meters ? ` (${w.depth_meters}m depth)` : ""} - ${w.duration_minutes || "?"} min`
    ).join("\n");

    // Wishlist summary
    const wishlistSummary = wishlist.map((w: any, idx: number) =>
      `${idx + 1}. ${w.brand} ${w.model} (${w.dial_colors})${w.notes ? ` - ${w.notes}` : ""}${w.is_ai_suggested ? " [AI suggested]" : ""}`
    ).join("\n");

    // Purchase timeline
    const purchaseTimeline = watches
      .filter((w: any) => w.when_bought)
      .sort((a: any, b: any) => new Date(b.when_bought).getTime() - new Date(a.when_bought).getTime())
      .map((w: any) => `${w.when_bought}: ${w.brand} ${w.model} - $${(w.cost || 0).toLocaleString()}`)
      .join("\n");

    // Specs summary (for watches with detailed specs)
    const specsSummary = watchSpecs.map((s: any) => {
      const watch = watches.find((w: any) => w.id === s.watch_id);
      if (!watch) return null;
      return `${watch.brand} ${watch.model}: Case ${s.case_size || "?"}, Movement ${s.movement || "?"}, ${s.water_resistance || "?"} WR, Crystal: ${s.crystal || "?"}`;
    }).filter(Boolean).join("\n");

    // Collection statistics
    const totalValue = watches.reduce((sum: number, w: any) => sum + (w.cost || 0), 0);
    const avgValue = watches.length > 0 ? Math.round(totalValue / watches.length) : 0;
    const brandCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const colorCounts: Record<string, number> = {};
    
    watches.forEach((w: any) => {
      brandCounts[w.brand] = (brandCounts[w.brand] || 0) + 1;
      if (w.type) typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
      if (w.dial_color) colorCounts[w.dial_color] = (colorCounts[w.dial_color] || 0) + 1;
    });

    const topBrands = Object.entries(brandCounts).sort(([,a], [,b]) => b - a).slice(0, 5);
    const topTypes = Object.entries(typeCounts).sort(([,a], [,b]) => b - a);
    const topColors = Object.entries(colorCounts).sort(([,a], [,b]) => b - a).slice(0, 5);

    const systemPrompt = `You are "My Vault Assistant" - an expert collector, curator, and enthusiast assistant for Sora Vault, a luxury collection management app. You have deep knowledge about ${collectionLabel} and are helping a collector manage and understand their collection.

PERSONALITY:
- You are knowledgeable, passionate, and personable
- You speak as a fellow collector who genuinely appreciates fine ${collectionLabel}
- You provide insightful, personalized advice based on the user's actual collection data
- You can discuss history, craftsmanship, market trends, and collecting strategies
- You are helpful but not pushy; you respect the collector's preferences

CURRENT COLLECTION CONTEXT (${collectionLabel.toUpperCase()}):
Total Items: ${watches.length}
Total Value: $${totalValue.toLocaleString()}
Average Value: $${avgValue.toLocaleString()}
Top Brands: ${topBrands.map(([b, c]) => `${b} (${c})`).join(", ") || "None yet"}
Types: ${topTypes.map(([t, c]) => `${t} (${c})`).join(", ") || "Various"}
Color Preferences: ${topColors.map(([c, n]) => `${c} (${n})`).join(", ") || "Various"}

COLLECTION INVENTORY:
${collectionSummary || "No items in collection yet."}

PERSONAL NOTES & SENTIMENT:
${personalNotes || "No personal notes recorded yet."}

WEAR/USAGE PATTERNS:
${wearSummary || "No wear data recorded yet."}

TRIPS & TRAVEL:
${tripsSummary || "No trips recorded yet."}

EVENTS:
${eventsSummary || "No events recorded yet."}

SPORTS & ACTIVITIES:
${sportsSummary || "No sports activities recorded yet."}

${collectionType === "watches" ? `WATER USAGE:
${waterSummary || "No water usage recorded yet."}` : ""}

PURCHASE TIMELINE:
${purchaseTimeline || "No purchase dates recorded."}

${specsSummary ? `DETAILED SPECIFICATIONS:
${specsSummary}` : ""}

WISHLIST:
${wishlistSummary || "No wishlist items yet."}

${collectionInsights ? `COLLECTION INSIGHTS (AI-generated summary):
${collectionInsights}` : ""}

${tastePreferences ? `TASTE PREFERENCES:
${tastePreferences}` : ""}

INSTRUCTIONS:
- Answer questions about the user's collection using the data above
- Provide personalized recommendations based on their collection patterns
- Help them understand their collecting habits and preferences
- Suggest additions that would complement their collection
- Discuss market values, rarity, and investment potential when relevant
- Share interesting facts about specific items they own
- Help them track and manage their wear patterns
- Be conversational and engaging, not robotic
- If asked about something not in their data, acknowledge what you don't know

Remember: You have access to their ACTUAL collection data. Use it to provide specific, personalized responses.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Vault Pal chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
