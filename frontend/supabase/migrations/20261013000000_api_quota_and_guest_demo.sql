-- ============================================================================
-- Daily API quota and guest (anonymous) demo users
--
-- * consume_api_call(): every paid upstream call (Google Solar / Static Maps,
--   NREL) goes through a Next.js API route, which calls this first and answers
--   429 when it returns false. Counting lives in Postgres because serverless
--   instances share no memory, and it is keyed by auth.uid(), so a user can
--   only ever spend their own quota.
-- * Anonymous sign-ins (the "Try the demo" button) have no email, so
--   profiles.email becomes nullable. Guests get a smaller quota, and all guests
--   together share a daily cap, so minting guest sessions can't run up the bill.
-- * Guests can't create organizations (and can't be invited: invitations match
--   on email).
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.api_usage (
    user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day          date    NOT NULL DEFAULT current_date,
    calls        integer NOT NULL DEFAULT 0,
    is_anonymous boolean NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_api_usage_guests_day
    ON public.api_usage (day) WHERE is_anonymous;

-- Only consume_api_call() reads or writes usage
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_call() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    -- Per day (database time zone). One analysis is roughly 5 calls + 1 per roof.
    user_limit       CONSTANT integer := 500;
    guest_limit      CONSTANT integer := 60;
    all_guests_limit CONSTANT integer := 1500;
    guest       boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
    daily_limit integer := CASE WHEN guest THEN guest_limit ELSE user_limit END;
    used        integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    INSERT INTO public.api_usage AS u (user_id, day, calls, is_anonymous)
    VALUES (auth.uid(), current_date, 1, guest)
    ON CONFLICT (user_id, day) DO UPDATE SET calls = u.calls + 1
    RETURNING calls INTO used;

    IF used > daily_limit THEN
        RETURN false;
    END IF;

    IF guest THEN
        -- least(): a guest retrying past their own limit doesn't eat the shared cap
        SELECT sum(least(calls, guest_limit)) INTO used
        FROM public.api_usage WHERE day = current_date AND is_anonymous;
        RETURN used <= all_guests_limit;
    END IF;
    RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.consume_api_call() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_api_call() TO authenticated;

-- Same as 20261002000000_lock_down_org_rls.sql, plus the guest check
CREATE OR REPLACE FUNCTION public.create_organization(p_name text, p_subdomain text)
RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org public.organizations;
BEGIN
    IF coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
        RAISE EXCEPTION 'Create an account to set up an organization';
    END IF;

    PERFORM 1 FROM public.profiles WHERE id = auth.uid() AND organization_id IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'You already belong to an organization';
    END IF;

    INSERT INTO public.organizations (name, subdomain, tier, max_users)
    VALUES (p_name, p_subdomain, 'small', 5)
    RETURNING * INTO org;

    UPDATE public.profiles SET organization_id = org.id, role = 'owner' WHERE id = auth.uid();
    RETURN org;
END $$;

COMMIT;
