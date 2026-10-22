CREATE TABLE public.voice_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours', suspended_at timestamptz);
GRANT ALL ON public.voice_entries TO service_role;
ALTER TABLE public.voice_entries ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.voice_room_entries (room_id uuid NOT NULL, entry_id uuid NOT NULL REFERENCES public.voice_entries(id), peer_id uuid NOT NULL REFERENCES public.voice_entries(id), PRIMARY KEY (room_id, entry_id), CHECK (entry_id <> peer_id));
GRANT ALL ON public.voice_room_entries TO service_role;
ALTER TABLE public.voice_room_entries ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.register_voice_room(p_entry uuid, p_hash text, p_room uuid, p_peer uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_room::text, 1));
 IF NOT EXISTS (SELECT 1 FROM public.voice_entries WHERE id=p_entry AND token_hash=p_hash AND suspended_at IS NULL AND expires_at>now()) OR NOT EXISTS (SELECT 1 FROM public.voice_entries WHERE id=p_peer AND suspended_at IS NULL AND expires_at>now()) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.voice_room_entries WHERE room_id=p_room AND (entry_id NOT IN (p_entry,p_peer) OR peer_id NOT IN (p_entry,p_peer))) THEN RETURN false; END IF;
 INSERT INTO public.voice_room_entries(room_id,entry_id,peer_id) VALUES(p_room,p_entry,p_peer) ON CONFLICT DO NOTHING;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.register_voice_room(uuid,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_voice_room(uuid,text,uuid,uuid) TO service_role;
CREATE FUNCTION public.warn_voice_entry(p_reporter uuid,p_token_hash text,p_target uuid,p_room uuid,p_reason text,p_details text,p_request_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_hash,0));
 IF NOT EXISTS (SELECT 1 FROM public.voice_entries WHERE id=p_reporter AND token_hash=p_token_hash AND suspended_at IS NULL AND expires_at>now()) THEN RETURN false; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.voice_room_entries WHERE room_id=p_room AND entry_id=p_reporter AND peer_id=p_target) OR NOT EXISTS (SELECT 1 FROM public.voice_room_entries WHERE room_id=p_room AND entry_id=p_target AND peer_id=p_reporter) THEN RETURN false; END IF;
 IF (SELECT count(*) FROM public.voice_reports WHERE request_hash=p_request_hash AND created_at>now()-interval '1 hour')>=10 THEN RETURN false; END IF;
 INSERT INTO public.voice_reports(reporter_session,reported_session,room_id,reason,details,request_hash) VALUES(p_reporter,p_target,p_room,p_reason,p_details,p_request_hash) ON CONFLICT DO NOTHING;
 UPDATE public.voice_entries SET suspended_at=coalesce(suspended_at,now()) WHERE id=p_target;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.warn_voice_entry(uuid,text,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.warn_voice_entry(uuid,text,uuid,uuid,text,text,text) TO service_role;
COMMENT ON TABLE public.voice_entries IS 'Ephemeral guest entry capabilities, not accounts or permanent profiles. Suspension ends only this entry; new entries are permitted.';
COMMENT ON TABLE public.voice_reports IS 'Unverified complaints. Valid call reports suspend only the reported entry as a warning, not a finding of guilt or permanent ban.';
COMMENT ON FUNCTION public.submit_voice_report(uuid,uuid,uuid,text,text,text) IS 'DEPRECATED: replaced by warn_voice_entry with capability and reciprocal room membership checks.';