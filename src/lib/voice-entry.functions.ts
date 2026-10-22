import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const entryCredentialSchema = z.object({ id: z.string().uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) });
export type EntryCredential = z.infer<typeof entryCredentialSchema>;

export const createVoiceEntry = createServerFn({ method: "POST" }).handler(async () => {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join("");
  const { hashEntryToken } = await import("./voice-entry.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("voice_entries").insert({ token_hash: await hashEntryToken(token) }).select("id").single();
  if (error || !data) throw new Error("Não foi possível entrar. Tente novamente.");
  return { id: data.id, token };
});

export const checkVoiceEntry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entryCredentialSchema.parse(data))
  .handler(async ({ data }) => {
    const { getEntryState } = await import("./voice-entry.server");
    return getEntryState(data);
  });

export const registerVoiceRoom = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entryCredentialSchema.extend({ room: z.string().uuid(), peer: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { hashEntryToken } = await import("./voice-entry.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("register_voice_room", { p_entry: data.id, p_hash: await hashEntryToken(data.token), p_room: data.room, p_peer: data.peer });
    return { ok: !result.error && result.data === true };
  });