import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

interface TrackingPayload {
  siteId: string;
  sessionId: string;
  eventType: "page_view" | "api_call" | "error" | "custom" | "session_start" | "session_end" | "sale";
  eventName?: string;
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  apiEndpoint?: string;
  apiMethod?: string;
  apiStatus?: number;
  apiResponseTime?: number;
  errorMessage?: string;
  customData?: Record<string, unknown>;
  orderId?: string;
  productName?: string;
  productCategory?: string;
  revenue?: number;
  currency?: string;
  quantity?: number;
  discount?: number;
  tax?: number;
  paymentMethod?: string;
  conversionSource?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Rate limiting in-memory store (simple implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count < limit) {
    record.count++;
    return true;
  }

  return false;
}

function validatePayload(payload: unknown): payload is TrackingPayload {
  if (!payload || typeof payload !== "object") return false;

  const p = payload as Record<string, unknown>;
  return (
    typeof p.siteId === "string" &&
    typeof p.sessionId === "string" &&
    ["page_view", "api_call", "error", "custom", "session_start", "session_end", "sale"].includes(
      p.eventType as string
    )
  );
}

function sanitize(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.substring(0, 500).replace(/[<>]/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as unknown;

    if (!validatePayload(body)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = body as TrackingPayload;

    // Rate limit by session and site
    const rateLimitKey = `${payload.siteId}:${payload.sessionId}`;
    if (!checkRateLimit(rateLimitKey, 100, 60000)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert session
    const { error: sessionError } = await supabase
      .from("analytics_sessions")
      .upsert(
        {
          site_id: payload.siteId,
          session_id: sanitize(payload.sessionId),
          user_agent: sanitize(payload.userAgent),
          ip_address: sanitize(payload.ipAddress),
          country: sanitize(payload.country),
          device_type: sanitize(payload.device),
          browser: sanitize(payload.browser),
          os: sanitize(payload.os),
          referrer: sanitize(payload.referrer),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "site_id,session_id" }
      );

    if (sessionError) {
      console.error("Session upsert error:", sessionError);
    }

    // Insert event
    const { error: eventError } = await supabase.from("analytics_events").insert({
      site_id: payload.siteId,
      session_id: sanitize(payload.sessionId),
      event_type: payload.eventType,
      event_name: sanitize(payload.eventName),
      page_url: sanitize(payload.pageUrl),
      page_title: sanitize(payload.pageTitle),
      referrer: sanitize(payload.referrer),
      api_endpoint: sanitize(payload.apiEndpoint),
      api_method: sanitize(payload.apiMethod),
      api_status: payload.apiStatus,
      api_response_time_ms: payload.apiResponseTime,
      error_message: sanitize(payload.errorMessage),
      custom_data: payload.customData || null,
    });

    if (eventError) {
      console.error("Event insert error:", eventError);
      return new Response(JSON.stringify({ error: "Failed to track event" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert sale record if eventType is "sale"
    if (payload.eventType === "sale" && payload.revenue !== undefined) {
      const { error: saleError } = await supabase.from("analytics_sales").insert({
        site_id: payload.siteId,
        session_id: sanitize(payload.sessionId),
        order_id: sanitize(payload.orderId),
        product_name: sanitize(payload.productName),
        product_category: sanitize(payload.productCategory),
        revenue: payload.revenue,
        currency: sanitize(payload.currency) || "USD",
        quantity: payload.quantity || 1,
        discount: payload.discount || 0,
        tax: payload.tax || 0,
        payment_method: sanitize(payload.paymentMethod),
        conversion_source: sanitize(payload.conversionSource),
      });

      if (saleError) {
        console.error("Sale insert error:", saleError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tracking error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
