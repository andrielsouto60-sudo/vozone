import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const event = z.object({ event: z.string(), payment: z.object({ id: z.string().max(100) }).passthrough().optional() });

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { safeEqual, asaas, asaasLivemode } = await import("@/lib/asaas.server");
        const expected = process.env["ASAAS_WEBHOOK_TOKEN"];
        const got = request.headers.get("asaas-access-token") ?? "";
        if (!expected || !safeEqual(got, expected)) return new Response("unauthorized", { status: 401 });
        const parsed = event.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("bad request", { status: 400 });
        const { event: type, payment } = parsed.data;
        if (!payment || (type !== "PAYMENT_RECEIVED" && type !== "PAYMENT_CONFIRMED")) return Response.json({ ok: true });
        // Never trust the webhook body: re-read the payment from Asaas.
        const real = await asaas<{ id: string; status: string; value: number; billingType: string }>(`/payments/${payment.id}`);
        if (real.billingType !== "PIX" || (real.status !== "RECEIVED" && real.status !== "CONFIRMED")) return Response.json({ ok: true });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.rpc("credit_coin_order", { p_payment_id: real.id, p_amount_cents: Math.round(real.value * 100), p_livemode: asaasLivemode() });
        return Response.json({ ok: true });
      },
    },
  },
});
