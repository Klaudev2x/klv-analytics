import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isValidUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (url.includes("your-project-id")) return false;
  if (url.includes("placeholder")) return false;
  if (url.includes("example.com")) return false;
  if (!url.startsWith("https://")) return false;
  if (!url.includes(".supabase.co")) return false;
  return true;
}

function isValidKey(key: string | undefined): key is string {
  if (!key) return false;
  if (key.includes("your-")) return false;
  if (key.includes("placeholder")) return false;
  if (key.length < 20) return false;
  return true;
}

export const configStatus = {
  urlValid: isValidUrl(supabaseUrl),
  keyValid: isValidKey(supabaseKey),
  url: supabaseUrl || "",
  getConfigError(): string | null {
    if (!supabaseUrl && !supabaseKey) {
      return "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings, then redeploy.";
    }
    if (!isValidUrl(supabaseUrl)) {
      return `VITE_SUPABASE_URL is set to "${supabaseUrl}" which is not a valid Supabase URL. Update it to your real project URL (e.g. https://abc123.supabase.co) in Vercel settings, then redeploy.`;
    }
    if (!isValidKey(supabaseKey)) {
      return "VITE_SUPABASE_ANON_KEY is invalid or still set to a placeholder. Copy your real anon key from the Supabase dashboard and set it in Vercel, then redeploy.";
    }
    return null;
  },
};

export const supabase = (configStatus.urlValid && configStatus.keyValid)
  ? createClient(supabaseUrl, supabaseKey)
  : createClient("https://placeholder.supabase.co", "placeholder"); // dummy client — won't be used

export async function checkConnection(): Promise<{ ok: boolean; error?: string }> {
  const configError = configStatus.getConfigError();
  if (configError) {
    return { ok: false, error: configError };
  }

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
