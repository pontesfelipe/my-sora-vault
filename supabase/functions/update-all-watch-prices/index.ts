import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active watches
    const { data: watches, error: fetchError } = await supabase
      .from("watches")
      .select("id, brand, model, dial_color, case_size, movement, has_sapphire, when_bought")
      .eq("status", "active");

    if (fetchError) throw fetchError;
    if (!watches || watches.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active watches to update", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating market values for ${watches.length} watches`);

    let updated = 0;
    let failed = 0;

    // Process watches in batches of 5 to avoid rate limits
    for (let i = 0; i < watches.length; i += 5) {
      const batch = watches.slice(i, i + 5);

      const results = await Promise.allSettled(
        batch.map(async (watch) => {
          try {
            // Build search query
            let searchQuery = `${watch.brand} ${watch.model}`;
            if (watch.dial_color) searchQuery += ` ${watch.dial_color} dial`;
            if (watch.case_size) searchQuery += ` ${watch.case_size}`;
            if (watch.movement) searchQuery += ` ${watch.movement}`;

            const year = watch.when_bought ? new Date(watch.when_bought).getFullYear() : null;

            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: "You are a watch market analyst. Provide the current average resale price in USD. Only respond with a JSON object containing price (number) and msrp (number, current retail MSRP from the brand's official site)."
                  },
                  {
                    role: "user",
                    content: `Current average resale price AND official retail MSRP for: ${searchQuery}${year ? ` (${year})` : ''}. Search Chrono24, WatchCharts, eBay for resale and the official brand website for MSRP. Return JSON: {"price": <number>, "msrp": <number>}`
                  }
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "extract_prices",
                      description: "Extract market and MSRP prices",
                      parameters: {
                        type: "object",
                        properties: {
                          price: { type: "number", description: "Average resale price in USD" },
                          msrp: { type: "number", description: "Official retail MSRP in USD" }
                        },
                        required: ["price"],
                        additionalProperties: false
                      }
                    }
                  }
                ],
                tool_choice: { type: "function", function: { name: "extract_prices" } }
              }),
            });

            if (!aiResponse.ok) {
              console.error(`AI error for ${watch.brand} ${watch.model}: ${aiResponse.status}`);
              return null;
            }

            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (!toolCall?.function?.arguments) return null;

            const priceData = JSON.parse(toolCall.function.arguments);
            
            if (!priceData.price || priceData.price <= 0) return null;

            const updateFields: Record<string, any> = {
              average_resale_price: priceData.price,
            };

            // Update MSRP if available and watch doesn't already have one
            if (priceData.msrp && priceData.msrp > 0) {
              updateFields.msrp = priceData.msrp;
            }

            const { error: updateError } = await supabase
              .from("watches")
              .update(updateFields)
              .eq("id", watch.id);

            if (updateError) {
              console.error(`Update error for ${watch.id}:`, updateError);
              return null;
            }

            console.log(`Updated ${watch.brand} ${watch.model}: resale=$${priceData.price}${priceData.msrp ? `, msrp=$${priceData.msrp}` : ''}`);
            return true;
          } catch (err) {
            console.error(`Error processing ${watch.brand} ${watch.model}:`, err);
            return null;
          }
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) updated++;
        else failed++;
      }

      // Small delay between batches to respect rate limits
      if (i + 5 < watches.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`Completed: ${updated} updated, ${failed} failed out of ${watches.length}`);

    return new Response(
      JSON.stringify({ message: "Market value update complete", updated, failed, total: watches.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-all-watch-prices:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to update watch prices" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
