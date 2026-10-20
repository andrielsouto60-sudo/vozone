<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep browser voice transport in `src/lib/voice.ts` with acknowledged matchmaking, repeated room readiness, queued ICE, and bounded cleanup; subscriptions can start in either order.
- Require a live microphone before searching and count call duration only while media is connected; a matched peer is not proof of working audio.
- TURN relay credentials must be short-lived and supplied by a verified server integration, never a static public client secret; STUN-only connections cannot cover every network.
- Relay (TURN) credentials come from a server function using Cloudflare Realtime TURN secrets; the client caches them under an hour and falls back to STUN, so the token never reaches the browser.
