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
      <p className="text-sm font-semibold">Privacidade e cookies</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Guardamos neste navegador seu histórico, amigos e mensagens. Cookies de publicidade
        são opcionais: se você aceitar, o Google Ads poderá medir quando uma busca por voz
        começa. Recusar não impede conversar. Você pode mudar sua escolha depois.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => decide("granted")} className="rounded-full bg-gradient-primary font-bold text-primary-foreground">
          Aceitar publicidade
        </Button>
        <Button variant="ghost" onClick={() => decide("denied")} className="rounded-full">
          Só necessários
        </Button>
        <Link to="/privacidade" className="ml-auto text-sm underline underline-offset-4 text-muted-foreground">
          Privacidade
        </Link>
      </div>
    </div>
  );
}
