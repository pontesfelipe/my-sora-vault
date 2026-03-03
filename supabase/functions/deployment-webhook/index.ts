import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

/** Map conventional commit prefixes to change-log categories */
const PREFIX_MAP: Record<string, string> = {
  feat: "feature",
  fix: "fix",
  schema: "schema",
  config: "config",
  security: "security",
  perf: "performance",
  refactor: "refactor",
  docs: "docs",
  chore: "config",
  style: "refactor",
  ci: "config",
  test: "docs",
};

function parseCategory(message: string): { category: string; title: string } {
  // Match "type:" or "type(scope):" prefix
  const match = message.match(/^(\w+)(?:\([^)]*\))?:\s*(.*)$/);
  if (match) {
    const prefix = match[1].toLowerCase();
    const category = PREFIX_MAP[prefix] || "feature";
    return { category, title: match[2].trim() || message };
  }
  return { category: "feature", title: message };
}

function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return !secret; // skip if no secret configured
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expected = `sha256=${hmac.digest("hex")}`;
  return expected === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET") || "";
    const signature = req.headers.get("x-hub-signature-256");

    // Verify GitHub signature if secret is set
    if (webhookSecret && !verifyGitHubSignature(rawBody, signature, webhookSecret)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = req.headers.get("x-github-event");
    const payload = JSON.parse(rawBody);

    // Only process push events
    if (event !== "push") {
      return new Response(JSON.stringify({ message: `Ignored event: ${event}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const commits = payload.commits || [];
    const ref = payload.ref || "";
    const branch = ref.replace("refs/heads/", "");
    const pusherName = payload.pusher?.name || payload.sender?.login || "GitHub";
    const repoName = payload.repository?.name || "unknown";

    // Detect if this looks like a version tag or publish
    const isDefaultBranch = ref === `refs/heads/${payload.repository?.default_branch}`;

    // Filter out merge commits and empty messages
    const meaningfulCommits = commits.filter(
      (c: any) =>
        c.message &&
        !c.message.startsWith("Merge ") &&
        !c.message.startsWith("merge ") &&
        c.message.trim().length > 0
    );

    if (meaningfulCommits.length === 0) {
      return new Response(
        JSON.stringify({ message: "No meaningful commits to log" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin user to attribute entries to
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();

    const adminUserId = adminRole?.user_id;

    if (!adminUserId) {
      return new Response(JSON.stringify({ error: "No admin user found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const entries = meaningfulCommits.map((commit: any) => {
      const firstLine = commit.message.split("\n")[0].trim();
      const restLines = commit.message.split("\n").slice(1).join("\n").trim();
      const { category, title } = parseCategory(firstLine);

      // Detect breaking changes from commit message
      const isBreaking =
        commit.message.includes("BREAKING CHANGE") ||
        commit.message.includes("!:") ||
        firstLine.includes("!");

      // Extract affected files as components
      const affectedFiles = [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || []),
      ];
      const affectedComponents = [
        ...new Set(
          affectedFiles
            .map((f: string) => {
              // Extract top-level directory or meaningful component
              const parts = f.split("/");
              if (parts[0] === "src" && parts.length > 1) return parts[1];
              if (parts[0] === "supabase") return "backend";
              return parts[0];
            })
            .filter(Boolean)
        ),
      ].slice(0, 10);

      return {
        title,
        description: restLines || `Commit ${commit.id?.substring(0, 7)} on ${branch} by ${commit.author?.name || pusherName}`,
        category,
        status: "done",
        author: commit.author?.name || pusherName,
        is_breaking_change: isBreaking,
        affected_components: affectedComponents,
        version: null,
        rollback_notes: `Revert commit ${commit.id?.substring(0, 7)} — git revert ${commit.id?.substring(0, 7)}`,
        created_by: adminUserId,
      };
    });

    const { data, error } = await supabase
      .from("change_control_log")
      .insert(entries)
      .select("id");

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: `Created ${data.length} change log entries from ${branch}`,
        ids: data.map((d: any) => d.id),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
