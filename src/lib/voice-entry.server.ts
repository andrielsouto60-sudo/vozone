import type { EntryCredential } from "./voice-entry.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function hashEntryToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}

export async function getEntryState(entry: EntryCredential) {
  const { data, error } = await supabaseAdmin.from("voice_entries").select("suspended_at, expires_at").eq("id", entry.id).eq("token_hash", await hashEntryToken(entry.token)).maybeSingle();
  if (error) throw new Error("Não foi possível verificar o acesso.");
  if (!data) return { state: "expired" as const };
  if (data.suspended_at) return { state: "suspended" as const };
  if (Date.parse(data.expires_at) <= Date.now()) return { state: "expired" as const };
  return { state: "active" as const };
}