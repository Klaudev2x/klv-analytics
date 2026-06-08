import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://fuowphuqdnipprwjpgcj.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1b3dwaHVxZG5pcHByd2pwZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Mzk2NjAsImV4cCI6MjA5NjExNTY2MH0.5qWVNwXR4E0RIiQ_ueMxwM2teVzLnA1136xE4aIx-Ww";

function resolveUrl(envVal: string | undefined): string {
  if (!envVal || envVal.includes("your-project-id") || envVal.includes("placeholder")) {
    return FALLBACK_URL;
  }
  return envVal;
}

function resolveKey(envVal: string | undefined): string {
  if (!envVal || envVal.includes("your-") || envVal.includes("placeholder") || envVal.length < 20) {
    return FALLBACK_KEY;
  }
  return envVal;
}

const supabaseUrl = resolveUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseKey = resolveKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function checkConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.getSession();
    if (error && (error.message.includes("Failed to fetch") || error.message.includes("ERR_NAME"))) {
      return { ok: false, error: `Cannot reach your Supabase project at ${supabaseUrl}. The project may be paused or the URL is incorrect.` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

export async function trackingEndpoint(payload: unknown) {
  const functionUrl = `${supabaseUrl}/functions/v1/analytics-track`;
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Tracking failed: ${response.statusText}`);
  }

  return response.json();
}

export async function adminApiCall(
  endpoint: string,
  method: string = "GET",
  body?: unknown
) {
  const functionUrl = `${supabaseUrl}/functions/v1/analytics-api/${endpoint}`;

  const response = await fetch(functionUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
      apikey: supabaseKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export function subscribeToEvents(
  siteId: string,
  callback: (event: unknown) => void
) {
  const subscription = supabase
    .channel(`analytics:${siteId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "analytics_events",
        filter: `site_id=eq.${siteId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}
