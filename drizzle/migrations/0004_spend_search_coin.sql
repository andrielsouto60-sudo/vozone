CREATE OR REPLACE FUNCTION public.spend_search_coin(_token_hash text)
RETURNS TABLE(ok boolean, promo integer, paid integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.voice_wallets%ROWTYPE;
BEGIN
  SELECT * INTO w FROM public.voice_wallets WHERE token_hash = _token_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 0, 0; RETURN; END IF;
  IF w.promo_coins > 0 THEN
    UPDATE public.voice_wallets SET promo_coins = promo_coins - 1 WHERE id = w.id RETURNING * INTO w;
  ELSIF w.paid_coins > 0 THEN
    UPDATE public.voice_wallets SET paid_coins = paid_coins - 1 WHERE id = w.id RETURNING * INTO w;
  ELSE
    RETURN QUERY SELECT false, w.promo_coins, w.paid_coins; RETURN;
  END IF;
  RETURN QUERY SELECT true, w.promo_coins, w.paid_coins;
END $$;
REVOKE ALL ON FUNCTION public.spend_search_coin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_search_coin(text) TO service_role;