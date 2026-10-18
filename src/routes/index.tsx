import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Phone, MessageCircle, History, UserPlus, Bell, ChevronUp, Mic, MicOff, PhoneOff, Send, ArrowLeft, Check,
} from "lucide-react";
import bunny from "@/assets/bunny.png";
import ghost from "@/assets/ghost.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vozone — Bate-papo por voz aleatório" },
      { name: "description", content: "Converse por voz com pessoas aleatórias. Escolha quem você ouve." },
      { property: "og:title", content: "Vozone — Bate-papo por voz aleatório" },
      { property: "og:description", content: "Converse por voz com pessoas aleatórias." },
    ],
  }),
  component: App,
});

type Tab = "voz" | "msg" | "hist";
type Gender = "Todos" | "Mulheres" | "Homens";
type Mode = "Equilibrado" | "Brasil" | "Mundo";
type Stage = "home" | "busca" | "chamada";
type Person = { id: string; name: string; gender: string; country: string };
type Call = Person & { date: number; secs: number };
type Msg = { from: "eu" | "ele"; text: string };

const NAMES_F = ["Ana", "Julia", "Bia", "Luna", "Carol", "Mel"];
const NAMES_M = ["Lucas", "Pedro", "Rafa", "Theo", "Gabriel", "Leo"];
const COUNTRIES = ["🇧🇷 Brasil", "🇵🇹 Portugal", "🇦🇷 Argentina", "🇺🇸 EUA", "🇲🇽 México"];
const SLIDES: { t: string; s: string }[] = [
  { t: "Fale com alguém novo.", s: "conversas por voz, anônimas e na hora" },
  { t: "Sem fotos, só vozes.", s: "seja você mesmo sem se preocupar" },
  { t: "Escolha quem você ouve.", s: "uma preferência e encontre alguém disponível" },
];

function load<T>(k: string, d: T): T {
  try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; }
}
function save(k: string, v: unknown) { localStorage.setItem(k, JSON.stringify(v)); }
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function App() {
  const [tab, setTab] = useState<Tab>("voz");
  const [stage, setStage] = useState<Stage>("home");
  const [gender, setGender] = useState<Gender>("Todos");
  const [mode, setMode] = useState<Mode>("Equilibrado");
  const [menu, setMenu] = useState<"g" | "m" | null>(null);
  const [slide, setSlide] = useState(2);
  const [partner, setPartner] = useState<Person | null>(null);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [history, setHistory] = useState<Call[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [openChat, setOpenChat] = useState<Person | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    setHistory(load("vz_hist", [])); setFriends(load("vz_friends", [])); setChats(load("vz_chats", {}));
  }, []);
  useEffect(() => { const i = setInterval(() => setSlide((s) => (s + 1) % 3), 4000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (stage !== "chamada") return;
    const i = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(i);
  }, [stage]);
  useEffect(() => {
    if (stage !== "busca") return;
    const t = setTimeout(() => {
      const g = gender === "Todos" ? pick(["F", "M"]) : gender === "Mulheres" ? "F" : "M";
      setPartner({
        id: crypto.randomUUID(), name: pick(g === "F" ? NAMES_F : NAMES_M), gender: g,
        country: mode === "Brasil" ? COUNTRIES[0]! : pick(COUNTRIES),
      });
      setSecs(0); setStage("chamada");
    }, 2500 + Math.random() * 3000);
    return () => clearTimeout(t);
  }, [stage, gender, mode]);

  const start = async () => {
    try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { /* sem mic */ }
    setStage("busca");
  };
  const stopMic = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  const cancel = () => { stopMic(); setStage("home"); };
  const hangup = () => {
    if (partner) { const h = [{ ...partner, date: Date.now(), secs }, ...history].slice(0, 50); setHistory(h); save("vz_hist", h); }
    stopMic(); setMuted(false); setStage("home");
  };
  const toggleMute = () => { stream.current?.getAudioTracks().forEach((t) => (t.enabled = muted)); setMuted(!muted); };
  const addFriend = (p: Person) => {
    if (friends.some((f) => f.id === p.id)) return;
    const f = [p, ...friends]; setFriends(f); save("vz_friends", f);
  };
  const sendMsg = (p: Person, text: string) => {
    const c = { ...chats, [p.id]: [...(chats[p.id] || []), { from: "eu" as const, text }] };
    setChats(c); save("vz_chats", c);
    setTimeout(() => {
      setChats((prev) => {
        const n = { ...prev, [p.id]: [...(prev[p.id] || []), { from: "ele" as const, text: pick(["Haha verdade!", "Que legal 😄", "Bora conversar de novo?", "Oi! Tudo bem?"]) }] };
        save("vz_chats", n); return n;
      });
    }, 1500);
  };

  if (stage === "busca") return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-accent animate-ring" />
          <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-accent">
            <img src={ghost} alt="Fantasminha" width={816} height={816} className="h-36 w-36 object-contain" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold leading-tight">Encontrando uma combinação...</h1>
        <p className="text-lg text-muted-foreground">Encontrar alguém que esteja acordado neste momento...</p>
      </div>
      <div className="p-5">
        <button onClick={cancel} className="w-full rounded-full bg-destructive py-4 text-lg font-bold text-destructive-foreground">Cancelar pesquisa</button>
      </div>
    </Screen>
  );

  if (stage === "chamada" && partner) {
    const isFriend = friends.some((f) => f.id === partner.id);
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-accent">
            <img src={partner.gender === "F" ? bunny : ghost} alt="" width={816} height={816} className="h-36 w-36 object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold">{partner.name}</h1>
          <p className="text-muted-foreground">{partner.country}</p>
          <p className="text-2xl font-bold text-primary-glow">{fmt(secs)}</p>
          <button onClick={() => addFriend(partner)} disabled={isFriend}
            className="mt-2 flex items-center gap-2 rounded-full bg-secondary px-5 py-2 font-semibold">
            {isFriend ? <><Check size={18} /> Amigo adicionado</> : <><UserPlus size={18} /> Adicionar amigo</>}
          </button>
        </div>
        <div className="flex justify-center gap-8 p-8">
          <button onClick={toggleMute} aria-label="Microfone" className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            {muted ? <MicOff /> : <Mic />}
          </button>
          <button onClick={hangup} aria-label="Desligar" className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <PhoneOff />
          </button>
        </div>
      </Screen>
    );
  }

  if (openChat) return (
    <ChatView person={openChat} msgs={chats[openChat.id] || []} onBack={() => setOpenChat(null)} onSend={(t) => sendMsg(openChat, t)} />
  );

  return (
    <Screen>
      <header className="flex items-center justify-between px-5 pt-5">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-accent">
          <img src={ghost} alt="Perfil" width={816} height={816} className="h-11 w-11 object-contain" />
        </div>
        <span className="text-xl font-extrabold text-primary-glow">Vozone</span>
        <div className="flex items-center gap-4 text-muted-foreground">
          <UserPlus size={24} /><Bell size={24} />
        </div>
      </header>

      {tab === "voz" && (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <img src={bunny} alt="Coelhinho" width={816} height={816} className="h-36 w-36 object-contain" />
            <h1 className="mt-4 text-4xl font-extrabold">{SLIDES[slide]!.t}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{SLIDES[slide]!.s}</p>
            <div className="mt-4 flex gap-2">
              {SLIDES.map((_, i) => <span key={i} className={`h-2 rounded-full ${i === slide ? "w-8 bg-primary" : "w-2 bg-secondary"}`} />)}
            </div>
          </div>
          <div className="space-y-4 px-5 pb-4">
            <div className="relative grid grid-cols-2 gap-3">
              <Pill onClick={() => setMenu(menu === "g" ? null : "g")} label={gender === "Todos" ? "Gênero" : gender} icon="⚥" />
              <Pill onClick={() => setMenu(menu === "m" ? null : "m")} label={mode} icon="🌎" />
              {menu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-3xl bg-card p-2">
                  {(menu === "g" ? ["Todos", "Mulheres", "Homens"] : ["Equilibrado", "Brasil", "Mundo"]).map((o) => (
                    <button key={o} onClick={() => { menu === "g" ? setGender(o as Gender) : setMode(o as Mode); setMenu(null); }}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold hover:bg-secondary">
                      {o}{(menu === "g" ? gender : mode) === o && <Check size={18} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={start} className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-primary py-4 text-lg font-bold text-primary-foreground">
              <Phone size={22} fill="currentColor" /> Iniciar bate-papo por voz
            </button>
            <p className="text-center text-sm text-muted-foreground">Apenas para maiores de 18 anos. Seja respeitoso.</p>
          </div>
        </>
      )}

      {tab === "msg" && (
        <List title="Mensagens" empty="Adicione amigos durante uma chamada para conversar aqui.">
          {friends.map((f) => {
            const last = chats[f.id]?.at(-1)?.text;
            return (
              <button key={f.id} onClick={() => setOpenChat(f)} className="flex w-full items-center gap-3 rounded-3xl bg-card p-3 text-left">
                <Avatar g={f.gender} />
                <div className="min-w-0"><p className="font-bold">{f.name}</p><p className="truncate text-sm text-muted-foreground">{last || f.country}</p></div>
              </button>
            );
          })}
        </List>
      )}

      {tab === "hist" && (
        <List title="Histórico" empty="Suas chamadas aparecerão aqui.">
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-3 rounded-3xl bg-card p-3">
              <Avatar g={h.gender} />
              <div className="flex-1"><p className="font-bold">{h.name}</p><p className="text-sm text-muted-foreground">{h.country} · {new Date(h.date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p></div>
              <span className="text-sm font-semibold text-primary-glow">{fmt(h.secs)}</span>
            </div>
          ))}
        </List>
      )}

      <nav className="grid grid-cols-3 rounded-t-3xl border-t border-border py-3">
        {([["voz", Phone, "Bate-papo por voz"], ["msg", MessageCircle, "Mensagens"], ["hist", History, "Histórico"]] as const).map(([k, Icon, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-1 text-sm font-semibold ${tab === k ? "text-foreground" : "text-muted-foreground"}`}>
            <Icon size={24} />{l}
          </button>
        ))}
      </nav>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background text-foreground">{children}</div>;
}
function Pill({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-2 rounded-full bg-card py-4 text-lg font-bold">
      <span>{icon}</span>{label}<ChevronUp size={18} className="text-muted-foreground" />
    </button>
  );
}
function Avatar({ g }: { g: string }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent">
      <img src={g === "F" ? bunny : ghost} alt="" width={816} height={816} loading="lazy" className="h-11 w-11 object-contain" />
    </div>
  );
}
function List({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-6">
      <h1 className="mb-4 text-3xl font-extrabold">{title}</h1>
      {children.length ? <div className="space-y-3">{children}</div> : <p className="mt-16 text-center text-muted-foreground">{empty}</p>}
    </div>
  );
}
function ChatView({ person, msgs, onBack, onSend }: { person: Person; msgs: Msg[]; onBack: () => void; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <Screen>
      <header className="flex items-center gap-3 border-b border-border p-4">
        <button onClick={onBack} aria-label="Voltar"><ArrowLeft /></button>
        <Avatar g={person.gender} /><p className="font-bold">{person.name}</p>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[75%] rounded-3xl px-4 py-2 ${m.from === "eu" ? "ml-auto bg-primary text-primary-foreground" : "bg-card"}`}>{m.text}</div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText(""); } }} className="flex gap-2 p-4">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem..."
          className="flex-1 rounded-full bg-card px-5 py-3 outline-none" />
        <button aria-label="Enviar" className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><Send size={20} /></button>
      </form>
    </Screen>
  );
}
