// Synthesizes a clean mobile/WhatsApp-style chime using Web Audio API
// No external asset downloads required; works offline and has 0 latency.
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Soft high chime note pair (587.33Hz D5 -> 880Hz A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.33);
  } catch {
    // Audio context may be blocked by autoplay policies until user interacts
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch {
    return false;
  }
};

export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions,
  onClick?: () => void
) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Only show desktop notification if window is blurred/hidden to avoid double disruption
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  try {
    const n = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });
    if (onClick) {
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    }
  } catch (err) {
    console.warn("Desktop notification error:", err);
  }
};
