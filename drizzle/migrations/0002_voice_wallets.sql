CREATE TABLE public.voice_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  nickname text NOT NULL,
  promo_coins integer NOT NULL DEFAULT 100,
  paid_coins integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.voice_wallets TO service_role;
ALTER TABLE public.voice_wallets ENABLE ROW LEVEL SECURITY;