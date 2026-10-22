import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { reportSchema } from "./voice-preferences";
import { entryCredentialSchema } from "./voice-entry.functions";

/** A valid reciprocal call complaint ends only the target's current entry. */
export const submitReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reportSchema.and(entryCredentialSchema).parse(data))
  .handler(async ({ data }) => {
    if (data.id !== data.reporter) return { ok: false, message: "A entrada não corresponde à denúncia." };
    const ip = getRequestHeader("cf-connecting-ip") ?? "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
    const hash = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
    const { hashEntryToken } = await import("./voice-entry.server");
    // Secret entry capability and reciprocal room records authorize this narrow write.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: accepted, error } = await supabaseAdmin.rpc("warn_voice_entry", { p_reporter: data.reporter, p_token_hash: await hashEntryToken(data.token), p_target: data.target, p_room: data.room, p_reason: data.reason, p_details: data.details, p_request_hash: hash });
    if (error || !accepted) return { ok: false, message: "Não foi possível aplicar a suspensão. Verifique a conexão e tente novamente." };
    return { ok: true, message: "Denúncia registrada. A entrada atual desse contato foi suspensa como advertência." };
  });