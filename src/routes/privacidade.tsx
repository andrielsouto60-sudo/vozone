import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { openCookieSettings } from "@/lib/consent";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade — Vozone" },
      { name: "description", content: "Como o Vozone usa cookies para medir anúncios e como retirar o consentimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Privacidade — Vozone" },
      { property: "og:description", content: "Como o Vozone usa cookies para medir anúncios." },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold">Privacidade</h1>
        <h2 className="mt-8 text-xl font-bold">Conversas e segurança</h2>
        <p className="mt-2 text-muted-foreground">
          O áudio das chamadas não é gravado pelo Vozone. Histórico, amigos e mensagens ficam
          guardados neste navegador. Entradas temporárias e denúncias ficam no servidor para
          verificar participantes e aplicar suspensões. Nas denúncias, o endereço IP é
          transformado em hash; esse identificador ainda deve ser tratado como dado pessoal.
          A publicidade não recebe seu apelido nem o conteúdo das chamadas.
        </p>
        <p className="mt-4 text-muted-foreground">
          O Vozone usa cookies de publicidade para medir o desempenho dos anúncios: saber quantas
          pessoas que clicaram em um anúncio começaram uma busca por voz no site. Esses cookies
          só são ativados após sua aceitação, inclusive no Brasil.
        </p>
        <h2 className="mt-8 text-xl font-bold">Quem recebe esses dados</h2>
        <p className="mt-2 text-muted-foreground">
          O Google Ads (Google LLC) recebe as informações de navegação coletadas por esses cookies
          para calcular as conversões dos anúncios.
        </p>
        <h2 className="mt-8 text-xl font-bold">Para que são usados</h2>
        <p className="mt-2 text-muted-foreground">
          Medição de conversões e otimização dos anúncios do Vozone. Não vendemos seus dados e não
          enviamos seu nome ou apelido para fins de publicidade.
        </p>
        <h2 className="mt-8 text-xl font-bold">Como mudar sua escolha</h2>
        <p className="mt-2 text-muted-foreground">
          Você pode aceitar ou recusar o aviso de cookies, e mudar de ideia quando quiser.
        </p>
        <Button
          onClick={openCookieSettings}
          className="mt-4 rounded-full bg-gradient-primary font-bold text-primary-foreground"
        >
          Gerenciar cookies
        </Button>
        <p className="mt-8">
          <Link to="/" className="text-sm underline underline-offset-4 text-muted-foreground">
            Voltar para o Vozone
          </Link>
        </p>
      </div>
    </main>
  );
}
