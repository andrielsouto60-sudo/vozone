import { z } from "zod";

export type OwnGender = "M" | "F" | "U";
export const genderOptions = [{ value: "M", label: "Homem" }, { value: "F", label: "Mulher" }, { value: "U", label: "Não informar" }] as const;
export const reportReasons = [{ value: "shouting", label: "Gritos" }, { value: "loud_music", label: "Música muito alta" }, { value: "sexual_content", label: "Conteúdo sexual" }, { value: "harassment", label: "Desrespeito ou assédio" }, { value: "other", label: "Outro motivo" }] as const;
export const reportSchema = z.object({ reporter: z.string().uuid(), target: z.string().uuid(), room: z.string().uuid(), reason: z.enum(["shouting", "loud_music", "sexual_content", "harassment", "other"]), details: z.string().trim().max(1000) }).refine((v) => v.reporter !== v.target, { message: "Não é possível denunciar a si mesmo." });
export const genderLabel = (gender: string) => gender === "M" ? "Homem" : gender === "F" ? "Mulher" : "Não informar";
export const genderSymbol = (gender: string) => gender === "M" ? "♂" : gender === "F" ? "♀" : "●";

/** Every visit is a new entry, with no restored name or lasting punishment. */
export function freshEntry(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  storage.removeItem("vz_me");
  storage.removeItem("vz_guest_id");
  const id = crypto.randomUUID();
  return { id, me: null };
}