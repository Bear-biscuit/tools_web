export type SystemNotificationState =
  | "unsupported"
  | "insecure"
  | "default"
  | "granted"
  | "denied";

export function getSystemNotificationState(): SystemNotificationState {
  if (!("Notification" in window)) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return Notification.permission;
}

export async function registerSystemNotificationWorker() {
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return null;

  try {
    return await navigator.serviceWorker.register("/notification-worker.js", {
      scope: "/",
    });
  } catch {
    return null;
  }
}

export async function requestSystemNotificationPermission(): Promise<SystemNotificationState> {
  const state = getSystemNotificationState();
  if (state !== "default") return state;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registerSystemNotificationWorker();
    }
    return permission;
  } catch {
    return getSystemNotificationState();
  }
}

export async function showSystemNotification(
  title: string,
  body: string,
): Promise<boolean> {
  if (getSystemNotificationState() !== "granted") return false;

  const options: NotificationOptions = {
    body,
    icon: "/bocchi-192.png",
    badge: "/bocchi-192.png",
    tag: "bocchi-timer-finished",
    requireInteraction: true,
    data: { url: "/tools/timer" },
  };

  if ("serviceWorker" in navigator) {
    try {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1500)),
      ]);
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    } catch {
      // Fall back to the page Notification API below.
    }
  }

  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
