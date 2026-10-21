CREATE TABLE public.voice_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_session uuid NOT NULL,
 reported_session uuid NOT NULL,
 room_id uuid NOT NULL,
 reason text NOT NULL CHECK (reason IN ('shouting','loud_music','sexual_content','harassment','other')),
 details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 1000),
 request_hash text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (reporter_session, reported_session, room_id)
);
GRANT ALL ON public.voice_reports TO service_role;
ALTER TABLE public.voice_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX voice_reports_rate ON public.voice_reports(request_hash, created_at);
CREATE FUNCTION public.submit_voice_report(p_reporter uuid, p_target uuid, p_room uuid, p_reason text, p_details text, p_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE report_id uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_hash, 0));
 IF p_reporter = p_target THEN RAISE EXCEPTION 'Invalid report'; END IF;
 IF (SELECT count(*) FROM public.voice_reports WHERE request_hash = p_hash AND created_at > now() - interval '1 hour') >= 10 THEN RAISE EXCEPTION 'Report limit reached'; END IF;
 INSERT INTO public.voice_reports(reporter_session, reported_session, room_id, reason, details, request_hash)
 VALUES (p_reporter, p_target, p_room, p_reason, p_details, p_hash)
 ON CONFLICT (reporter_session, reported_session, room_id) DO NOTHING RETURNING id INTO report_id;
 RETURN report_id;
END; $$;
REVOKE ALL ON FUNCTION public.submit_voice_report(uuid, uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_voice_report(uuid, uuid, uuid, text, text, text) TO service_role;
COMMENT ON TABLE public.voice_reports IS 'Unverified guest complaints; requires human review, never automatically ban based on counts. No audio recordings collected.';