import { beforeEach, describe, expect, it, vi } from "vitest";
import { canTrackAds, isConsentRequiredRegion, loadGoogleAds, STORAGE_KEY, trackVoiceSearch, updateConsent } from "./consent";

describe("optional advertising consent", () => {
  beforeEach(() => {
    localStorage.clear();
    document.querySelectorAll("script[data-google-ads]").forEach((script) => script.remove());
    window.dataLayer = [];
    window.gtag = vi.fn();
  });

  it("requires a first-access choice in every region including Brazil", async () => {
    expect(await isConsentRequiredRegion()).toBe(true);
    expect(await canTrackAds()).toBe(false);
  });

  it("does not load advertising or measure a search without acceptance", async () => {
    await trackVoiceSearch();
    expect(document.querySelector("script[data-google-ads]")).toBeNull();
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("keeps advertising disabled after an explicit refusal", async () => {
    localStorage.setItem(STORAGE_KEY, "denied");
    await loadGoogleAds(true);
    await trackVoiceSearch();
    expect(await canTrackAds()).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("measures a voluntary search only after explicit acceptance", async () => {
    localStorage.setItem(STORAGE_KEY, "granted");
    await trackVoiceSearch();
    expect(document.querySelectorAll("script[data-google-ads]")).toHaveLength(1);
    expect(window.gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-18553342853/7qaUCMGBmbEdEIWX9o5F", value: 1, currency: "BRL",
    });
  });

  it("stops new measurements when consent is withdrawn", async () => {
    localStorage.setItem(STORAGE_KEY, "denied");
    updateConsent("denied");
    if (window.gtag) vi.mocked(window.gtag).mockClear();
    await trackVoiceSearch();
    expect(window.gtag).not.toHaveBeenCalled();
  });
});