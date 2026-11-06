import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const walletToken = z.string().regex(/^[a-f0-9]{64}$/);

async function findWallet(token: string) {
  const { hashEntryToken } = await import("./voice-entry.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("voice_wallets").select("id, nickname, promo_coins, paid_coins").eq("token_hash", await hashEntryToken(token)).maybeSingle();
  if (!data) throw new Error("Carteira não encontrada. Entre novamente.");
  return { wallet: data, supabaseAdmin };
}

export const createPixCharge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: walletToken,
    packageId: z.enum(["coins_50", "coins_100", "coins_200"]),
    cpf: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().regex(/^(\d{11}|\d{14})$/, "CPF inválido")),
  }).parse(d))
  .handler(async ({ data }) => {
    const { asaas, asaasLivemode, COIN_PACKAGES } = await import("./asaas.server");
    const { wallet, supabaseAdmin } = await findWallet(data.token);
    const pkg = COIN_PACKAGES[data.packageId];
    const livemode = asaasLivemode();
    const { data: order, error } = await supabaseAdmin.from("coin_orders").insert({ wallet_id: wallet.id, package_id: data.packageId, coins: pkg.coins, amount_cents: pkg.cents, livemode }).select("id").single();
    if (error || !order) throw new Error("Não foi possível criar o pedido.");
    const customer = await asaas<{ id: string }>("/customers", { method: "POST", body: { name: wallet.nickname, cpfCnpj: data.cpf, notificationDisabled: true } });
    const due = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const payment = await asaas<{ id: string }>("/payments", { method: "POST", body: { customer: customer.id, billingType: "PIX", value: pkg.cents / 100, dueDate: due, description: `Vozone ${pkg.coins} moedas`, externalReference: order.id } });
    await supabaseAdmin.from("coin_orders").update({ provider_payment_id: payment.id }).eq("id", order.id);
    const qr = await asaas<{ encodedImage: string; payload: string }>(`/payments/${payment.id}/pixQrCode`);
    return { orderId: order.id, qrImage: qr.encodedImage, copyPaste: qr.payload, coins: pkg.coins, cents: pkg.cents };
  });

export const getPixOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: walletToken, orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { wallet, supabaseAdmin } = await findWallet(data.token);
    const { data: order } = await supabaseAdmin.from("coin_orders").select("status").eq("id", data.orderId).eq("wallet_id", wallet.id).maybeSingle();
    const { data: w } = await supabaseAdmin.from("voice_wallets").select("promo_coins, paid_coins").eq("id", wallet.id).single();
    return { paid: order?.status === "paid", promo: w?.promo_coins ?? 0, paidCoins: w?.paid_coins ?? 0 };
  });
