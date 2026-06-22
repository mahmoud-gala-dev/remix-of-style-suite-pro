// Browser notifications + Web Push subscription helpers.
// `notify()` shows an in-tab Notification for the current user.
// `subscribeToPush()`/`unsubscribeFromPush()` manage the VAPID-backed
// service-worker subscription so the server can deliver pushes even when
// the tab is closed.
import { b64urlToUint8, VAPID_PUBLIC_KEY_B64URL } from "./push-vapid";
import { savePushSubscription, deletePushSubscription } from "./push.functions";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
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

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw-push.js");
  if (existing) return existing;
  return await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
}

function subToJSON(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
}

export async function subscribeToPush(): Promise<boolean> {
  if (!webPushSupported()) return false;
  const perm = await requestPushPermission();
  if (perm !== "granted") return false;
  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64urlToUint8(VAPID_PUBLIC_KEY_B64URL),
    });
  }
  await savePushSubscription({ data: subToJSON(sub) });
  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!webPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await deletePushSubscription({ data: { endpoint: sub.endpoint } });
  } finally {
    await sub.unsubscribe();
  }
}