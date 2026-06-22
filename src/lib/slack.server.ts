// Lightweight Slack webhook notifier for critical alerts.
// Set SLACK_WEBHOOK_URL secret to enable. No-op otherwise.

export function slackConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

export async function notifySlack(text: string, context?: Record<string, unknown>): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  // Off by default — admin must enable in Settings → Data.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "slack_alerts_enabled")
      .maybeSingle();
    if (!data || data.value !== true) return;
  } catch {
    return;
  }
  const ctx = context && Object.keys(context).length
    ? "\n```" + JSON.stringify(context, null, 2).slice(0, 1800) + "```"
    : "";
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `:rotating_light: ${text}${ctx}` }),
    });
  } catch {
    // swallow — alerts must never break the request
  }
}
