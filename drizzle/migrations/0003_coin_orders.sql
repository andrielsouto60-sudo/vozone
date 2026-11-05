CREATE TABLE public.coin_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.voice_wallets(id) ON DELETE CASCADE,
  package_id text NOT NULL,
  coins integer NOT NULL,
  amount_cents integer NOT NULL,
  provider_payment_id text UNIQUE,
  livemode boolean NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT ALL ON public.coin_orders TO service_role;
ALTER TABLE public.coin_orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.credit_coin_order(p_payment_id text, p_amount_cents integer, p_livemode boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.coin_orders;
BEGIN
  UPDATE public.coin_orders SET status = 'paid', paid_at = now()
   WHERE provider_payment_id = p_payment_id AND status = 'pending'
     AND amount_cents = p_amount_cents AND livemode = p_livemode
  RETURNING * INTO o;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.voice_wallets SET paid_coins = paid_coins + o.coins WHERE id = o.wallet_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.credit_coin_order(text, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_coin_order(text, integer, boolean) TO service_role;