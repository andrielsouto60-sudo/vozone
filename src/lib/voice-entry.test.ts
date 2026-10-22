import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ row: null as null | { suspended_at: string | null; expires_at: string }, error: null as null | Error }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.row, error: state.error }) }) }) }) }) } }));
import { getEntryState } from "./voice-entry.server";
import { freshEntry } from "./voice-preferences";
const entry = { id: "cc72fc74-e5cf-476b-8619-613fe2d616a0", token: "a".repeat(64) };
describe("temporary entry warning", () => {
  beforeEach(() => { state.error = null; state.row = { suspended_at: null, expires_at: new Date(Date.now() + 60000).toISOString() }; });
  it("rejects a suspended entry immediately even when it has not expired", async () => {
    state.row = { suspended_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60000).toISOString() };
    expect((await getEntryState(entry)).state).toBe("suspended");
  });
  it("allows a new active entry independently of previous punishments", async () => {
    expect((await getEntryState({ ...entry, id: "6c2ee5d4-4dcc-4364-b4c6-c27ed4dcba54" })).state).toBe("active");
  });
  it("does not accept an unknown credential", async () => {
    state.row = null;
    expect((await getEntryState(entry)).state).toBe("expired");
  });
  it("clears saved entry information and does not reuse punished identity", () => {
    const values = new Map([["vz_me", '{"name":"Old"}'], ["vz_guest_id", entry.id]]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
    const first = freshEntry(storage);
    expect(first.me).toBeNull(); expect(first.id).not.toBe(entry.id);
    expect(values.has("vz_me")).toBe(false); expect(values.has("vz_guest_id")).toBe(false);
    expect(freshEntry(storage).id).not.toBe(first.id);
  });
});