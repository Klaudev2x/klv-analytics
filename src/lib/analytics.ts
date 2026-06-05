import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
