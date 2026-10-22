import { supabase } from "@/integrations/supabase/client";

export type Me = { id: string; name: string; gender: "F" | "M" | "U" };
export type Peer = { id: string; name: string; gender: string; country: string };
type Want = "Todos" | "Mulheres" | "Homens";
type Candidate = Peer & { want: Want; ts: number };
export type CallStatus = "connecting" | "connected" | "reconnecting";
const STUN: RTCIceServer = { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] };
let relay: RTCIceServer[] = [];
let relayExpires = 0;
/** Fetch short-lived relay credentials before a call; failures fall back to STUN only. */
export async function loadRelay() {
  if (relay.length && relayExpires > Date.now()) return;
  try {
    const { getIceServers } = await import("./turn.functions");
    const { iceServers } = await getIceServers();
    relay = iceServers as RTCIceServer[]; relayExpires = Date.now() + 50 * 60 * 1000;
  } catch { relay = []; }
}
const ok = (want: Want, g: string) => want === "Todos" || (want === "Mulheres" ? g === "F" : g === "M");
const isPeer = (p: unknown): p is Peer => {
  if (!p || typeof p !== "object") return false;
  const v = p as Partial<Peer>;
  return typeof v.id === "string" && typeof v.name === "string" && typeof v.country === "string" && (v.gender === "F" || v.gender === "M" || v.gender === "U");
};

/** A repeated, acknowledged handshake prevents missing a peer during channel startup. */
export function search(me: Me, want: Want, country: string, onMatch: (room: string, peer: Peer, caller: boolean) => void, onError: (message: string) => void = () => {}, excluded: ReadonlySet<string> = new Set()) {
  let done = false;
  let subscribed = false;
  let pending: { peer: Peer; room: string; caller: boolean; expires: number } | null = null;
  const ch = supabase.channel("lobby", { config: { presence: { key: me.id }, broadcast: { ack: true } } });
  const from: Candidate = { ...me, country, want, ts: Date.now() };
  const send = (event: string, payload: unknown) => ch.send({ type: "broadcast", event, payload });
  const finish = (room: string, peer: Peer, caller: boolean) => {
    if (done) return;
    done = true; clearInterval(retry); void supabase.removeChannel(ch); onMatch(room, peer, caller);
  };
  const tick = () => {
    if (done || !subscribed) return;
    if (pending && pending.expires < Date.now()) pending = null;
    if (!pending) {
      const peers = Object.values(ch.presenceState<Candidate>()).flat().filter((p) => isPeer(p) && p.id !== me.id && !excluded.has(p.id) && ok(want, p.gender) && ok(p.want, me.gender));
      peers.sort((a, b) => a.ts - b.ts);
      const peer = peers.find((p) => me.id < p.id);
      if (peer) pending = { peer, room: crypto.randomUUID(), caller: true, expires: Date.now() + 10000 };
    }
    if (pending) void send(pending.caller ? "invite" : "accept", { to: pending.peer.id, room: pending.room, from });
  };
  const retry = setInterval(tick, 1000);
  ch.on("presence", { event: "sync" }, tick)
    .on("presence", { event: "join" }, tick)
    .on("broadcast", { event: "invite" }, ({ payload }) => {
      if (done || payload?.to !== me.id || typeof payload.room !== "string" || !isPeer(payload.from)) return;
      if (excluded.has(payload.from.id) || !ok(want, payload.from.gender) || !ok((payload.from as Candidate).want, me.gender) || payload.from.id >= me.id) return;
      if (pending && (pending.room !== payload.room || pending.peer.id !== payload.from.id)) return;
      pending = { peer: payload.from, room: payload.room, caller: false, expires: Date.now() + 10000 }; tick();
    })
    .on("broadcast", { event: "accept" }, async ({ payload }) => {
      const match = pending;
      if (done || !match?.caller || payload?.to !== me.id || payload.room !== match.room || payload.from?.id !== match.peer.id) return;
      const result = await send("confirm", { to: match.peer.id, room: match.room });
      if (result === "ok" && !done && pending === match) finish(match.room, match.peer, true);
    })
    .on("broadcast", { event: "confirm" }, ({ payload }) => {
      if (!done && pending && !pending.caller && payload?.to === me.id && payload.room === pending.room) finish(pending.room, pending.peer, false);
    })
    .subscribe((s) => {
      subscribed = s === "SUBSCRIBED";
      if (subscribed) void ch.track(from).then(tick);
      if (!done && (s === "CHANNEL_ERROR" || s === "TIMED_OUT")) { onError("A conexão caiu durante a busca. Tente novamente."); cleanup(); }
    });
  const cleanup = () => { done = true; clearInterval(retry); void supabase.removeChannel(ch); };
  return cleanup;
}

/** Repeated readiness, queued ICE and bounded recovery keep audio negotiation reliable. */
export function connectCall(room: string, caller: boolean, stream: MediaStream, audio: HTMLAudioElement, onEnd: (message?: string) => void, onStatus: (status: CallStatus) => void = () => {}, onPlaybackBlocked: () => void = () => {}) {
  const pc = new RTCPeerConnection({ iceServers: [STUN, ...relay] });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  const remote = new MediaStream();
  let closed = false;
  let subscribed = false;
  let negotiating = false;
  let answered = false;
  let recovery: ReturnType<typeof setTimeout> | undefined;
  const candidates: RTCIceCandidateInit[] = [];
  const outbound: { event: string; payload: unknown }[] = [];
  const ch = supabase.channel(`room:${room}`, { config: { broadcast: { ack: true } } });
  const send = async (event: string, payload: unknown) => {
    if (closed) return;
    if (!subscribed) { outbound.push({ event, payload }); return; }
    if (await ch.send({ type: "broadcast", event, payload }) !== "ok" && !closed) onStatus("reconnecting");
  };
  const close = (notify: boolean, message?: string) => {
    if (closed) return;
    if (!notify && subscribed) void ch.send({ type: "broadcast", event: "bye", payload: {} }).finally(() => supabase.removeChannel(ch));
    else void supabase.removeChannel(ch);
    closed = true; clearInterval(heartbeat); clearTimeout(deadline); clearTimeout(recovery);
    pc.onconnectionstatechange = null; pc.onicecandidate = null; pc.ontrack = null;
    pc.close(); audio.pause(); audio.srcObject = null;
    if (notify) onEnd(message);
  };
  const guard = (task: () => Promise<void>) => { if (!closed) void task().catch(() => { if (!closed) close(true, "Não foi possível conectar o áudio. Tente outra chamada."); }); };
  const flush = async () => {
    while (!closed && pc.remoteDescription && candidates.length) {
      const candidate = candidates.shift(); if (candidate) await pc.addIceCandidate(candidate);
    }
  };
  const offer = async (restart = false) => {
    if (closed || negotiating || (!restart && pc.localDescription)) return;
    negotiating = true;
    try { const o = await pc.createOffer({ iceRestart: restart }); if (closed) return; await pc.setLocalDescription(o); await send("offer", o); }
    finally { negotiating = false; }
  };
  pc.ontrack = (e) => {
    remote.addTrack(e.track); audio.srcObject = e.streams[0] ?? remote;
    audio.autoplay = true; audio.play().catch(onPlaybackBlocked);
  };
  pc.onicecandidate = (e) => { if (e.candidate) void send("ice", e.candidate.toJSON()); };
  pc.onconnectionstatechange = () => {
    if (closed) return;
    if (pc.connectionState === "connected") { clearTimeout(recovery); recovery = undefined; clearTimeout(deadline); onStatus("connected"); }
    else if (["disconnected", "failed"].includes(pc.connectionState)) {
      onStatus("reconnecting");
      if (recovery) return;
      if (caller && pc.signalingState === "stable") guard(() => offer(true));
      recovery = setTimeout(() => close(true, "O sinal caiu e não foi possível recuperar a chamada."), 15000);
    }
  };
  const heartbeat = setInterval(() => {
    if (closed || !subscribed || pc.connectionState === "connected") return;
    void send("ready", {});
    if (caller && pc.localDescription && !answered) void send("offer", pc.localDescription.toJSON());
    if (!caller && pc.localDescription) void send("answer", pc.localDescription.toJSON());
  }, 1000);
  const deadline = setTimeout(() => close(true, "O áudio não conectou. Tente novamente; algumas redes precisam de uma conexão de retransmissão."), 30000);
  onStatus("connecting");
  ch.on("broadcast", { event: "ready" }, () => { if (caller) guard(() => offer()); })
    .on("broadcast", { event: "offer" }, ({ payload }) => {
      if (caller) return;
      guard(async () => {
        if (negotiating) return; negotiating = true;
        try {
          if (pc.remoteDescription?.sdp === payload.sdp && pc.localDescription) { await send("answer", pc.localDescription.toJSON()); return; }
          await pc.setRemoteDescription(payload); if (closed) return; await flush();
          const a = await pc.createAnswer(); if (closed) return; await pc.setLocalDescription(a); await send("answer", a);
        } finally { negotiating = false; }
      });
    })
    .on("broadcast", { event: "answer" }, ({ payload }) => {
      if (!caller) return;
      guard(async () => { if (pc.signalingState !== "have-local-offer") return; await pc.setRemoteDescription(payload); answered = true; await flush(); });
    })
    .on("broadcast", { event: "ice" }, ({ payload }) => { guard(async () => { candidates.push(payload); await flush(); }); })
    .on("broadcast", { event: "bye" }, () => close(true))
    .subscribe((s) => {
      if (closed) return;
      subscribed = s === "SUBSCRIBED";
      if (subscribed) { for (const item of outbound.splice(0)) void send(item.event, item.payload); void send("ready", {}); }
      else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") onStatus("reconnecting");
    });
  return () => close(false);
}

export function listenInbox(myId: string, onMsg: (from: Peer, text: string) => void) {
  const ch = supabase.channel(`inbox:${myId}`).on("broadcast", { event: "msg" }, ({ payload }) => {
    if (isPeer(payload?.from) && typeof payload.text === "string") onMsg(payload.from, payload.text);
  }).subscribe();
  return () => { void supabase.removeChannel(ch); };
}
/** A notification is only a hint; the receiver checks its entry on the server. */
export function listenWarning(myId: string, onWarning: () => void) {
  const ch = supabase.channel(`warning:${myId}`).on("broadcast", { event: "warning" }, onWarning).subscribe();
  return () => { void supabase.removeChannel(ch); };
}
export function notifyWarning(to: string) {
  const ch = supabase.channel(`warning:${to}`, { config: { broadcast: { ack: true } } });
  const timeout = setTimeout(() => supabase.removeChannel(ch), 5000);
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") void ch.send({ type: "broadcast", event: "warning", payload: {} }).finally(() => { clearTimeout(timeout); void supabase.removeChannel(ch); });
  });
}
export function sendDM(to: string, from: Peer, text: string) {
  const ch = supabase.channel(`inbox:${to}`, { config: { broadcast: { ack: true } } });
  const timeout = setTimeout(() => supabase.removeChannel(ch), 10000);
  ch.subscribe((s) => {
    if (s === "SUBSCRIBED") void ch.send({ type: "broadcast", event: "msg", payload: { from, text } }).finally(() => { clearTimeout(timeout); void supabase.removeChannel(ch); });
  });
}
