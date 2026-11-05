// Server-only Asaas client. The API key never reaches the browser.
export const COIN_PACKAGES = {
  coins_10: { coins: 10, cents: 100 },
  coins_20: { coins: 20, cents: 200 },
  coins_30: { coins: 30, cents: 300 },
  coins_50: { coins: 50, cents: 500 },
} as const;
export type PackageId = keyof typeof COIN_PACKAGES;

function config() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("Pix ainda não está configurado.");
  const livemode = key.startsWith("$aact_prod_");
  return { key, livemode, base: livemode ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3" };
}

export function asaasLivemode() {
  return config().livemode;
}

export async function asaas<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { key, base } = config();
  const res = await fetch(base + path, {
    method: init?.method ?? "GET",
    headers: { access_token: key, "Content-Type": "application/json", "User-Agent": "Vozone" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { errors?: { description: string }[] };
  if (!res.ok) throw new Error(json.errors?.[0]?.description || `Asaas ${res.status}`);
  return json;
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
