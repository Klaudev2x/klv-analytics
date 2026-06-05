import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TIER_LIMITS: Record<string, number> = {
  free: 1,
  pro: 5,
  business: 25,
  agency: 1000,
};

async function getUserOr401(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { user: null, errorResponse: new Response(JSON.stringify({ error: "Unauthorized: " + (userError?.message || "no user") }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })};
  }
  return { user, errorResponse: null };
}

async function handleRequest(req: Request, supabase: ReturnType<typeof createClient>) {
  const url = new URL(req.url);
  const path = url.pathname.split("/").filter(Boolean);
  const method = req.method;

  // GET /analytics-api/sites - List user's sites
  if (method === "GET" && path[path.length - 1] === "sites") {
    const { user, errorResponse } = await getUserOr401(supabase);
    if (!user) return errorResponse!;

    const { data, error } = await supabase
      .from("analytics_sites")
      .select("*")
      .eq("owner_id", user.id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /analytics-api/sites - Create new site (with tier enforcement)
  if (method === "POST" && path[path.length - 1] === "sites") {
    const { user, errorResponse } = await getUserOr401(supabase);
    if (!user) return errorResponse!;

    const body = await req.json() as Record<string, unknown>;
    const name = String(body.name || "");
    const domain = String(body.domain || "");

    if (!name || !domain) {
      return new Response(JSON.stringify({ error: "Name and domain required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription tier and site limit
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .single();

    const tier = (sub as Record<string, string> | null)?.tier || "free";
    const limit = TIER_LIMITS[tier] ?? 1;

    const { count: currentSites } = await supabase
      .from("analytics_sites")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if ((currentSites || 0) >= limit) {
      return new Response(JSON.stringify({
        error: `Your ${tier} plan allows ${limit === 1000 ? "unlimited" : limit} site(s). Upgrade your plan to add more.`,
        code: "SITE_LIMIT_EXCEEDED",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteKey = crypto.getRandomValues(new Uint8Array(16)).toString();

    const { data, error } = await supabase
      .from("analytics_sites")
      .insert({
        name,
        domain,
        site_key: siteKey,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-create free subscription if none exists
    if (!sub) {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        tier: "free",
      });
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // GET /analytics-api/subscription - Get user's subscription tier
  if (method === "GET" && path[path.length - 1] === "subscription") {
    const { user, errorResponse } = await getUserOr401(supabase);
    if (!user) return errorResponse!;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .single();

    const tier = (sub as Record<string, string> | null)?.tier || "free";

    return new Response(JSON.stringify({ tier }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // GET /analytics-api/stats/{siteId} - Get aggregated stats
  if (method === "GET" && path.includes("stats")) {
    const { user, errorResponse } = await getUserOr401(supabase);
    if (!user) return errorResponse!;

    const siteId = path[path.indexOf("stats") + 1];
    if (!siteId) {
      return new Response(JSON.stringify({ error: "Site ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: site } = await supabase
      .from("analytics_sites")
      .select("owner_id")
      .eq("id", siteId)
      .single();

    if (!site || (site as Record<string, string>).owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const period = url.searchParams.get("period") || "24h";
    const startTime = new Date();

    if (period === "24h") startTime.setHours(startTime.getHours() - 24);
    else if (period === "7d") startTime.setDate(startTime.getDate() - 7);
    else if (period === "30d") startTime.setDate(startTime.getDate() - 30);

    const { count: activeUsers } = await supabase
      .from("analytics_sessions")
      .select("*", { count: "exact", head: true })
      .eq("site_id", siteId)
      .gte("created_at", startTime.toISOString())
      .is("ended_at", null);

    const { count: totalEvents } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("site_id", siteId)
      .gte("created_at", startTime.toISOString());

    const { data: topPages } = await supabase
      .from("analytics_events")
      .select("page_url, page_title")
      .eq("site_id", siteId)
      .eq("event_type", "page_view")
      .gte("created_at", startTime.toISOString())
      .limit(10);

    const { data: errors } = await supabase
      .from("analytics_events")
      .select("error_message, created_at")
      .eq("site_id", siteId)
      .eq("event_type", "error")
      .gte("created_at", startTime.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    return new Response(
      JSON.stringify({
        activeUsers: activeUsers || 0,
        totalEvents: totalEvents || 0,
        topPages: topPages || [],
        recentErrors: errors || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    return await handleRequest(req, supabase);
  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
