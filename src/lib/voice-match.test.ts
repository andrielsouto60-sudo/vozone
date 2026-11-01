import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { compatible } from "./voice";
const p = (gender: string, want: "Todos" | "Mulheres" | "Homens", country: string) => ({ gender, want, country });
describe("match compatibility", () => {
  it("Brasil only matches Brasil", () => { expect(compatible(p("M", "Todos", "🇧🇷 Brasil"), p("F", "Todos", "🌏 Mundo"))).toBe(false); expect(compatible(p("M", "Todos", "🇧🇷 Brasil"), p("F", "Todos", "🇧🇷 Brasil"))).toBe(true); });
  it("gender preference must hold on both sides", () => { expect(compatible(p("M", "Mulheres", "🌏 Mundo"), p("F", "Mulheres", "🌏 Mundo"))).toBe(false); expect(compatible(p("M", "Mulheres", "🌏 Mundo"), p("F", "Homens", "🌏 Mundo"))).toBe(true); });
});
