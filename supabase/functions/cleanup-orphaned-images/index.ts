import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get all ai_image_url values currently referenced by watches
    const { data: watches, error: watchError } = await supabase
      .from("watches")
      .select("ai_image_url")
      .not("ai_image_url", "is", null);

    if (watchError) throw watchError;

    const referencedFiles = new Set<string>();
    for (const w of watches || []) {
      if (w.ai_image_url) {
        // Extract file path from full URL: .../watch-images/filename.png → filename.png
        const match = w.ai_image_url.match(/\/watch-images\/(.+)$/);
        if (match) referencedFiles.add(match[1]);
      }
    }

    // 2. List all files in the watch-images bucket
    const { data: files, error: listError } = await supabase.storage
      .from("watch-images")
      .list("", { limit: 1000 });

    if (listError) throw listError;

    // 3. Find orphaned files (in storage but not referenced)
    const orphaned = (files || []).filter(
      (f) => f.name && !referencedFiles.has(f.name)
    );

    if (orphaned.length === 0) {
      return new Response(
        JSON.stringify({ deleted: 0, message: "No orphaned images found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Delete orphaned files
    const pathsToDelete = orphaned.map((f) => f.name);
    const { error: deleteError } = await supabase.storage
      .from("watch-images")
      .remove(pathsToDelete);

    if (deleteError) throw deleteError;

    console.log(`Cleaned up ${pathsToDelete.length} orphaned images`);

    return new Response(
      JSON.stringify({
        deleted: pathsToDelete.length,
        files: pathsToDelete,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
