import { createServerFn } from "@tanstack/react-start";

/** Issues short-lived Cloudflare TURN credentials; the API token never leaves the server. */
export const getIceServers = createServerFn({ method: "POST" }).handler(async () => {
  const id = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!id || !token) return { iceServers: [] as RTCIceServer[] };
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: 3600 }),
  });
  if (!res.ok) { console.error(`TURN credentials failed [${res.status}]: ${await res.text()}`); return { iceServers: [] as RTCIceServer[] }; }
  const data = (await res.json()) as { iceServers?: RTCIceServer | RTCIceServer[] };
  const list = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
  return { iceServers: list };
});
