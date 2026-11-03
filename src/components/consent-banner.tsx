import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { STORAGE_KEY, isConsentRequiredRegion, updateConsent, loadGoogleAds } from "@/lib/consent";

export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    if (localStorage.getItem(STORAGE_KEY) === null) {
      void isConsentRequiredRegion().then((required) => {
        if (alive && required && localStorage.getItem(STORAGE_KEY) === null) setOpen(true);
      });
    }
    const settings = () => setOpen(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) updateConsent(e.newValue === "granted" ? "granted" : "denied");
    };
    window.addEventListener("cookie-settings", settings);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("cookie-settings", settings);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!open) return null;

  const decide = (decision: "granted" | "denied") => {
    localStorage.setItem(STORAGE_KEY, decision);
    updateConsent(decision);
    setOpen(false);
    if (decision === "granted") void loadGoogleAds(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-4 bottom-4 z-50 rounded-3xl border border-border bg-card p-5 shadow-xl"
    >
      <p className="text-sm font-semibold">Aviso de cookies</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Usamos cookies para medir os anúncios do Vozone: quantas pessoas que viu um anúncio
        começaram uma conversa por voz. Os dados vão para o Google Ads. Você pode aceitar ou
        recusar, e mudar de ideia depois.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => decide("granted")} className="rounded-full bg-gradient-primary font-bold text-primary-foreground">
          Aceitar
        </Button>
        <Button variant="ghost" onClick={() => decide("denied")} className="rounded-full">
          Recusar
        </Button>
        <Link to="/privacidade" className="ml-auto text-sm underline underline-offset-4 text-muted-foreground">
          Privacidade
        </Link>
      </div>
    </div>
  );
}
