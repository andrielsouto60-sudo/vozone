import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type Me = { id: string; name: string; gender: "F" | "M" };
export type Peer = { id: string; name: string; gender: string; country: string };
type Want = "Todos" | "Mulheres" | "Homens";

const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
const ok = (want: Want, g: string) => want === "Todos" || (want === "Mulheres" ? g === "F" : g === "M");

/** Fila de busca: encontra alguém compatível e devolve sala + parceiro. */
export function search(me: Me, want: Want, country: string, onMatch: (room: string, peer: Peer, caller: boolean) => void) {
  let done = false;
  let pending: string | null = null;
  const ch: RealtimeChannel = supabase.channel("lobby", { config: { presence: { key: me.id } } });
  const finish = (room: string, peer: Peer, caller: boolean) => {
    if (done) return; done = true; supabase.removeChannel(ch); onMatch(room, peer, caller);
  };
  const tryMatch = () => {
    if (done || pending) return;
    const st = ch.presenceState<{ id: string; name: string; gender: string; want: Want; country: string; ts: number }>();
    const list = Object.values(st).map((a) => a[0]!).filter((p) => p && p.id !== me.id && ok(want, p.gender) && ok(p.want, me.gender));
    list.sort((a, b) => a.ts - b.ts);
    const c = list.find((p) => me.id < p.id); // só o menor id convida
    if (!c) return;
    pending = c.id;
    const room = crypto.randomUUID();
    ch.send({ type: "broadcast", event: "invite", payload: { to: c.id, room, from: { id: me.id, name: me.name, gender: me.gender, country } } });
    setTimeout(() => { if (!done) { pending = null; tryMatch(); } }, 4000);
  };
  ch.on("presence", { event: "sync" }, tryMatch)
    .on("broadcast", { event: "invite" }, ({ payload }) => {
      if (payload.to !== me.id || done || pending) return;
      ch.send({ type: "broadcast", event: "accept", payload: { to: payload.from.id, room: payload.room, from: { id: me.id, name: me.name, gender: me.gender, country } } });
      finish(payload.room, payload.from, false);
    })
    .on("broadcast", { event: "accept" }, ({ payload }) => {
      if (payload.to !== me.id || payload.from.id !== pending) return;
      finish(payload.room, payload.from, true);
    })
    .subscribe((s) => {
      if (s === "SUBSCRIBED") ch.track({ id: me.id, name: me.name, gender: me.gender, want, country, ts: Date.now() });
    });
  return () => { done = true; supabase.removeChannel(ch); };
}

/** Chamada de voz WebRTC usando a sala como sinalização. */
export function connectCall(room: string, caller: boolean, stream: MediaStream | null, audio: HTMLAudioElement, onEnd: () => void) {
  const pc = new RTCPeerConnection(ICE);
  stream?.getTracks().forEach((t) => pc.addTrack(t, stream));
  pc.ontrack = (e) => { audio.srcObject = e.streams[0] ?? null; audio.play().catch(() => {}); };
  const ch = supabase.channel(`room:${room}`);
  const send = (event: string, payload: unknown) => ch.send({ type: "broadcast", event, payload });
  pc.onicecandidate = (e) => e.candidate && send("ice", e.candidate.toJSON());
  pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState)) close(true); };
  let closed = false;
  const close = (notify: boolean) => {
    if (closed) return; closed = true;
    if (!notify) send("bye", {});
    pc.close(); setTimeout(() => supabase.removeChannel(ch), 300);
    if (notify) onEnd();
  };
  const offer = async () => { const o = await pc.createOffer(); await pc.setLocalDescription(o); send("offer", o); };
  ch.on("broadcast", { event: "ready" }, () => caller && offer())
    .on("broadcast", { event: "offer" }, async ({ payload }) => {
      await pc.setRemoteDescription(payload); const a = await pc.createAnswer(); await pc.setLocalDescription(a); send("answer", a);
    })
    .on("broadcast", { event: "answer" }, ({ payload }) => pc.setRemoteDescription(payload))
    .on("broadcast", { event: "ice" }, ({ payload }) => pc.addIceCandidate(payload).catch(() => {}))
    .on("broadcast", { event: "bye" }, () => close(true))
    .subscribe((s) => { if (s === "SUBSCRIBED" && !caller) send("ready", {}); });
  return () => close(false);
}

/** Mensagens diretas: cada pessoa escuta a própria caixa de entrada. */
export function listenInbox(myId: string, onMsg: (from: Peer, text: string) => void) {
  const ch = supabase.channel(`inbox:${myId}`).on("broadcast", { event: "msg" }, ({ payload }) => onMsg(payload.from, payload.text)).subscribe();
  return () => { supabase.removeChannel(ch); };
}
export function sendDM(to: string, from: Peer, text: string) {
  const ch = supabase.channel(`inbox:${to}`);
  ch.subscribe((s) => {
    if (s === "SUBSCRIBED") ch.send({ type: "broadcast", event: "msg", payload: { from, text } }).finally(() => supabase.removeChannel(ch));
  });
}
