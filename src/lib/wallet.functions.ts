import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const WELCOME_BONUS = 100;

const input = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  nickname: z.string().trim().min(1).max(40),
});

/** Opens (or creates) this browser's coin wallet. New wallets get the welcome bonus once;
 * a different nickname on the same wallet zeroes promotional coins, never purchased ones. */
export const openWallet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const { hashEntryToken } = await import("./voice-entry.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.token) {
      const hash = await hashEntryToken(data.token);
      const { data: w } = await supabaseAdmin.from("voice_wallets").select("id, nickname, promo_coins, paid_coins").eq("token_hash", hash).maybeSingle();
      if (w) {
        const same = w.nickname.toLowerCase() === data.nickname.toLowerCase();
        const promo = same ? w.promo_coins : 0;
        await supabaseAdmin.from("voice_wallets").update({ nickname: data.nickname, promo_coins: promo, last_seen_at: new Date().toISOString() }).eq("id", w.id);
        return { token: data.token, promo, paid: w.paid_coins, welcome: false };
      }
    }
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join("");
    const { error } = await supabaseAdmin.from("voice_wallets").insert({ token_hash: await hashEntryToken(token), nickname: data.nickname, promo_coins: WELCOME_BONUS });
    if (error) throw new Error("Não foi possível abrir sua carteira.");
    return { token, promo: WELCOME_BONUS, paid: 0, welcome: true };
  });
