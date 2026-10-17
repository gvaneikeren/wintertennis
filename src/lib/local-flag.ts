// Per-device "seen / dismissed" flags for onboarding hints. Storage can be blocked (private mode),
// so every access is guarded; losing a flag only means a hint shows again.

export function getFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setFlag(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}

export function storageAvailable(): boolean {
  try {
    const k = "wt:probe";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
