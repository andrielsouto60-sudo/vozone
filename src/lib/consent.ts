declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const STORAGE_KEY = "cookie_consent";
const CONSENT_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH','CA'];
const AW_ID = "AW-18553342853";
const SEND_TO = "AW-18553342853/7qaUCMGBmbEdEIWX9o5F";

let consentRegion: Promise<boolean> | undefined;

export function isConsentRequiredRegion(): Promise<boolean> {
  return consentRegion ??= lookupConsentRegion();
}

async function lookupConsentRegion(): Promise<boolean> {
  try {
    const res = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return true;
    const trace = await res.text();
    const host = trace.match(/^h=(.+)$/m)?.[1]?.trim().toLowerCase();
    if (host !== location.hostname) return true;
    const country = trace.match(/^loc=([A-Z0-9]{2})$/m)?.[1];
    if (!country || country === "XX" || country === "T1") return true;
    return CONSENT_COUNTRIES.includes(country);
  } catch {
    return true;
  }
}

export async function hasAdConsent(): Promise<boolean> {
  return localStorage.getItem(STORAGE_KEY) === "granted";
}

export async function canTrackAds(): Promise<boolean> {
  const choice = localStorage.getItem(STORAGE_KEY);
  if (choice !== null) return choice === "granted";
  const required = await isConsentRequiredRegion();
  const latest = localStorage.getItem(STORAGE_KEY);
  return latest !== null ? latest === "granted" : !required;
}

export function updateConsent(decision: "granted" | "denied") {
  if (localStorage.getItem(STORAGE_KEY) === "denied") decision = "denied";
  if (decision === "denied") window.gtag?.("set", "user_data", null);
  window.gtag?.("consent", "update", {
    ad_storage: decision,
    ad_user_data: decision,
    ad_personalization: decision,
  });
}

export async function loadGoogleAds(consentModeRoute = true) {
  const allowed = await canTrackAds();
  if (!consentModeRoute && !allowed) return;
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
  await loadGoogleAds(true);
  window.gtag?.("event", "conversion", { send_to: SEND_TO, value: 1.0, currency: "BRL" });
}

export function openCookieSettings() {
  window.dispatchEvent(new Event("cookie-settings"));
}
