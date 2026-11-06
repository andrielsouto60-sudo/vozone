import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPixCharge, getPixOrder } from "@/lib/pix.functions";

const packs = [
  { id: "coins_50", coins: 50, price: "R$ 5,00" },
  { id: "coins_100", coins: 100, price: "R$ 10,00" },
  { id: "coins_200", coins: 200, price: "R$ 20,00" },
] as const;

type Charge = { orderId: string; qrImage: string; copyPaste: string; coins: number };

export function BuyCoinsDialog({ open, onOpenChange, onBalance }: { open: boolean; onOpenChange: (o: boolean) => void; onBalance: (b: { promo: number; paid: number }) => void }) {
  const create = useServerFn(createPixCharge);
  const check = useServerFn(getPixOrder);
  const [pack, setPack] = useState<(typeof packs)[number]["id"]>("coins_50");
  const [cpf, setCpf] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [charge, setCharge] = useState<Charge | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (!open) { setCharge(null); setDone(false); setError(""); setCopied(false); } }, [open]);
  useEffect(() => {
    if (!charge || done) return;
    const token = localStorage.getItem("vz_wallet");
    if (!token) return;
    const t = setInterval(async () => {
      try {
        const r = await check({ data: { token, orderId: charge.orderId } });
        onBalance({ promo: r.promo, paid: r.paidCoins });
        if (r.paid) setDone(true);
      } catch { /* keep polling */ }
    }, 4000);
    return () => clearInterval(t);
  }, [charge, done]);

  async function start() {
    const token = localStorage.getItem("vz_wallet");
    if (!token) return setError("Entre novamente para comprar.");
    setBusy(true); setError("");
    try { setCharge(await create({ data: { token, packageId: pack, cpf } })); }
    catch (e) { setError(e instanceof Error && e.message.length < 120 ? e.message : "Não foi possível gerar o Pix. Tente novamente."); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Comprar créditos com Pix</DialogTitle>
        <DialogDescription>Os créditos entram sozinhos assim que o Pix for confirmado.</DialogDescription>
        {done ? (
          <p role="status" className="text-center text-lg font-bold">Pagamento confirmado! +{charge?.coins} créditos 🪙</p>
        ) : charge ? (
          <div className="flex flex-col items-center gap-3">
            <img src={`data:image/png;base64,${charge.qrImage}`} alt="QR Code Pix" className="h-52 w-52 rounded-md bg-card" />
            <Button variant="secondary" className="w-full" onClick={async () => { await navigator.clipboard.writeText(charge.copyPaste); setCopied(true); }}>{copied ? "Código copiado!" : "Copiar Pix copia e cola"}</Button>
            <p className="text-sm text-muted-foreground">Aguardando pagamento...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {packs.map((p) => (
                <Button key={p.id} variant={pack === p.id ? "default" : "secondary"} aria-pressed={pack === p.id} onClick={() => setPack(p.id)} className="h-auto flex-col py-3">
                  <span className="font-bold">🪙 {p.coins}</span><span className="text-xs">{p.price}</span>
                </Button>
              ))}
            </div>
            <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value.slice(0, 18))} placeholder="Seu CPF (exigido para o Pix)" className="rounded-md bg-card px-4 py-3 outline-none" />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button disabled={busy || cpf.replace(/\D/g, "").length < 11} onClick={start}>{busy ? "Gerando Pix..." : "Gerar Pix"}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
