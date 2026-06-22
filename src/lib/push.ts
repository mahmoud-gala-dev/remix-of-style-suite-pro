// C — Browser notifications (lightweight, no server VAPID needed).
// Web Push with VAPID requires backend keys and a delivery worker; we ship
// the local Notification API now so staff get desktop alerts in-tab (e.g.
// "Next customer called") and add server-side delivery once VAPID is wired.

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!pushSupported()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return await Notification.requestPermission();
}

export function notify(title: string, body?: string, opts?: NotificationOptions) {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon-192.png", ...opts });
  } catch {
    /* ignore */
  }
}