import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const transport = vi.hoisted(() => ({ channels: [] as any[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  channel: vi.fn(() => {
    const ch = { handlers: {} as Record<string, any>, status: undefined as any, send: vi.fn().mockResolvedValue("ok"), track: vi.fn().mockResolvedValue("ok"), presenceState: () => ({}),
      on(_type: string, options: {event:string}, cb: any) { this.handlers[options.event] = cb; return this; },
      subscribe(cb: any) { this.status = cb; return this; } };
    transport.channels.push(ch); return ch;
  }), removeChannel: vi.fn().mockResolvedValue("ok")
} }));
import { connectCall, search } from "./voice";
class FakePC {
  static instances: FakePC[] = [];
  connectionState = "new"; signalingState = "stable";
  localDescription: any = null; remoteDescription: any = null;
  ontrack: any; onicecandidate: any; onconnectionstatechange: any;
  addTrack = vi.fn(); close = vi.fn();
  createOffer = vi.fn(async () => ({ type: "offer", sdp: "offer-sdp" }));
  createAnswer = vi.fn(async () => ({ type: "answer", sdp: "answer-sdp" }));
  setLocalDescription = vi.fn(async (v) => { this.localDescription = { ...v, toJSON: () => v }; this.signalingState = v.type === "offer" ? "have-local-offer" : "stable"; });
  setRemoteDescription = vi.fn(async (v) => { this.remoteDescription = v; });
  addIceCandidate = vi.fn(async () => { if (!this.remoteDescription) throw new Error("early ICE"); });
  constructor() { FakePC.instances.push(this); }
}
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
const stream = { getTracks: () => [{}] } as unknown as MediaStream;
const audio = { play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), srcObject: null } as unknown as HTMLAudioElement;
describe("voice negotiation", () => {
  beforeEach(() => { vi.useFakeTimers(); transport.channels.length = 0; FakePC.instances = []; vi.stubGlobal("RTCPeerConnection", FakePC); vi.stubGlobal("MediaStream", class {addTrack() {}}); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("repeats readiness after the other peer misses the initial message", async () => {
    const cleanup = connectCall("room", false, stream, audio, vi.fn());
    const ch = transport.channels[0]; ch.status("SUBSCRIBED"); await vi.advanceTimersByTimeAsync(2000);
    expect(ch.send.mock.calls.filter(([v]: any) => v.event === "ready").length).toBe(3); cleanup();
  });
  it("buffers early ICE until the offer has been installed", async () => {
    const cleanup = connectCall("room", false, stream, audio, vi.fn()); const ch = transport.channels[0]; const pc = FakePC.instances[0]; if (!pc) throw new Error("Missing peer connection");
    ch.status("SUBSCRIBED"); ch.handlers.ice({payload:{candidate:"candidate"}}); await settle(); expect(pc.addIceCandidate).not.toHaveBeenCalled();
    ch.handlers.offer({payload:{type:"offer",sdp:"offer"}}); await settle();
    expect(pc.addIceCandidate).toHaveBeenCalledWith({candidate:"candidate"}); expect(ch.send).toHaveBeenCalledWith(expect.objectContaining({event:"answer"})); cleanup();
  });
  it("ignores a duplicate answer once negotiation has completed", async () => {
    const cleanup = connectCall("room", true, stream, audio, vi.fn()); const ch = transport.channels[0]; const pc = FakePC.instances[0]; if (!pc) throw new Error("Missing peer connection");
    ch.status("SUBSCRIBED"); ch.handlers.ready(); await settle(); ch.handlers.answer({payload:{type:"answer",sdp:"answer"}}); await settle();
    pc.signalingState = "stable"; ch.handlers.answer({payload:{type:"answer",sdp:"answer"}}); await settle();
    expect(pc.setRemoteDescription).toHaveBeenCalledTimes(1); cleanup();
  });
  it("ends a call with a clear error instead of leaving a fake connected screen", async () => {
    const onEnd = vi.fn(); connectCall("room", false, stream, audio, onEnd); await vi.advanceTimersByTimeAsync(30000);
    expect(onEnd).toHaveBeenCalledTimes(1); expect(onEnd.mock.calls[0]?.[0]).toContain("O áudio não conectou"); expect(FakePC.instances[0]?.close).toHaveBeenCalledOnce();
  });
  it("clears readiness and timeouts on hangup", async () => {
    const onEnd = vi.fn(); const cleanup = connectCall("room", false, stream, audio, onEnd); const ch = transport.channels[0]; ch.status("SUBSCRIBED"); await settle(); cleanup(); await settle(); const count = ch.send.mock.calls.length;
    await vi.advanceTimersByTimeAsync(40000); expect(ch.send).toHaveBeenCalledTimes(count); expect(onEnd).not.toHaveBeenCalled(); expect(audio.srcObject).toBeNull();
  });
  it("waits for confirmation before joining an invited room", async () => {
    const matched = vi.fn(); const cleanup = search({id:"b",name:"Leo",gender:"M"}, "Todos", "🌏 Mundo", matched); const ch = transport.channels[0]; ch.status("SUBSCRIBED"); await settle();
    ch.handlers.invite({payload:{to:"b",room:"r",from:{id:"a",name:"Ana",gender:"F",country:"🌏 Mundo",want:"Todos"}}});
    expect(matched).not.toHaveBeenCalled(); expect(ch.send).toHaveBeenCalledWith(expect.objectContaining({event:"accept"}));
    ch.handlers.confirm({payload:{to:"b",room:"r"}}); expect(matched).toHaveBeenCalledWith("r",expect.objectContaining({name:"Ana"}),false); cleanup();
  });
});
