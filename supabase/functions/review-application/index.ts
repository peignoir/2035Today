import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = "pofpof";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { applicationId, action, adminPassword, bio } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Public action: applicant updates their own bio ──
    if (action === "update-bio") {
      if (!applicationId || !bio) {
        return new Response(
          JSON.stringify({ error: "applicationId and bio are required" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }

      const { error } = await supabase
        .from("applications")
        .update({ generated_bio: bio })
        .eq("id", applicationId)
        .eq("status", "pending"); // only allow edits on pending apps

      if (error) {
        console.error("Bio update error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update bio" }),
          { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // ── Admin actions: approve / reject ──
    if (adminPassword !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!applicationId || !["approved", "rejected"].includes(action)) {
      return new Response(
        JSON.stringify({
          error: "applicationId and action (approved|rejected) are required",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const { error } = await supabase
      .from("applications")
      .update({
        status: action,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) {
      console.error("Update error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update application" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, status: action }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
