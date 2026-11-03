declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const STORAGE_KEY = "cookie_consent";
const AW_ID = "AW-18553342853";
const SEND_TO = "AW-18553342853/7qaUCMGBmbEdEIWX9o5F";

/** Every visitor must make an explicit optional-advertising choice. */
export function isConsentRequiredRegion(): Promise<boolean> {
  return Promise.resolve(true);
}

export async function hasAdConsent(): Promise<boolean> {
  return localStorage.getItem(STORAGE_KEY) === "granted";
}

export async function canTrackAds(): Promise<boolean> {
  return hasAdConsent();
}

export function updateConsent(decision: "granted" | "denied") {
  if (decision === "denied") window.gtag?.("set", "user_data", null);
  window.gtag?.("consent", "update", {
    ad_storage: decision,
    ad_user_data: decision,
    ad_personalization: decision,
  });
}

export async function loadGoogleAds(_consentModeRoute = true) {
  const allowed = await canTrackAds();
  if (!allowed || localStorage.getItem(STORAGE_KEY) !== "granted") return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (!document.querySelector("script[data-google-ads]")) {
    updateConsent(allowed ? "granted" : "denied");
    window.gtag("set", "developer_id.dZjgwMW", true);
    window.gtag("js", new Date());
    window.gtag("config", AW_ID);
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${AW_ID}`;
    script.async = true;
    script.setAttribute("data-google-ads", "");
    document.head.appendChild(script);
  }
}

export async function trackVoiceSearch() {
  if (!(await canTrackAds())) return;
  await loadGoogleAds(true);
  if (localStorage.getItem(STORAGE_KEY) !== "granted") return;
  window.gtag?.("event", "conversion", { send_to: SEND_TO, value: 1.0, currency: "BRL" });
}

export function openCookieSettings() {
  window.dispatchEvent(new Event("cookie-settings"));
}
