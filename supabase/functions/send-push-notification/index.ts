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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, notification_type, title, body, data } = await req.json();

    if (!user_id || !notification_type) {
      return new Response(
        JSON.stringify({ error: "user_id and notification_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (prefs) {
      const prefMap: Record<string, string> = {
        like: "likes_enabled",
        trade: "trades_enabled",
        friend_request: "friends_enabled",
      };
      const prefKey = prefMap[notification_type];
      if (prefKey && !prefs[prefKey]) {
        return new Response(
          JSON.stringify({ message: "Notification disabled by user preferences" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get push tokens for user
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push tokens found for user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Implement actual FCM/APNs sending when keys are configured
    // For now, log the notification that would be sent
    console.log(`Would send push to ${tokens.length} devices:`, {
      title,
      body,
      data,
      tokens: tokens.map((t) => t.platform),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Push notification queued for ${tokens.length} device(s)`,
        note: "FCM/APNs keys not yet configured — notifications are logged but not delivered",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
