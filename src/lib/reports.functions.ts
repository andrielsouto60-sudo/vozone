import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { reportSchema } from "./voice-preferences";

/** Guest reports are unverified complaints, not proof and never an automatic ban. */
export const submitReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reportSchema.parse(data))
  .handler(async ({ data }) => {
    const ip = getRequestHeader("cf-connecting-ip") ?? "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
    const hash = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
    // Narrow public write: validated guest complaint only; no privileged reads or bans.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("submit_voice_report", { p_reporter: data.reporter, p_target: data.target, p_room: data.room, p_reason: data.reason, p_details: data.details, p_hash: hash });
    if (error) return { ok: false, message: "Não foi possível registrar a denúncia. Tente mais tarde." };
    return { ok: true, message: "Denúncia registrada, pendente de análise. Contato bloqueado neste navegador." };
  });