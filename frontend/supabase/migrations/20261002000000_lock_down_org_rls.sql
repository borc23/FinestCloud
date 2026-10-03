-- ============================================================================
-- Lock down profiles / organizations / invitations / activity_log
--
-- Replaces the ad-hoc RLS scripts (disable_rls_for_now, final_rls_fix, ...).
-- Idempotent: drops every existing policy on these tables and rebuilds the
-- intended state, whatever combination of the old scripts was applied.
--
-- Closes:
--   * RLS disabled on profiles/organizations, GRANT ALL to anon
--   * invitations readable/writable by anyone (USING (true) TO anon)
--   * every profile (email) readable by anyone
--   * users setting their own organization_id / role (self-promotion to owner
--     of any org), and choosing their own tier/max_users/features
--   * invitations accepted without email match or cancellation check
--   * forged activity_log entries / log_activity() for any org
--   * SVG (stored XSS) uploads to the public logo bucket
--
-- Role and membership changes now only happen through the SECURITY DEFINER
-- functions below, which enforce the rules server-side.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so policies on profiles can read profiles without
-- recursing into their own RLS)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_org_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_org_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.auth_email() RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT lower(auth.jwt() ->> 'email')
$$;

-- ----------------------------------------------------------------------------
-- Reset policies and privileges
-- ----------------------------------------------------------------------------

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'organizations', 'invitations', 'activity_log')
    LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles, public.organizations, public.invitations, public.activity_log
    FROM anon, authenticated;

GRANT SELECT,
      INSERT (id, email, display_name, default_latitude, default_longitude, show_tutorial),
      UPDATE (display_name, default_latitude, default_longitude, show_tutorial)
    ON public.profiles TO authenticated;

GRANT SELECT,
      UPDATE (name, company_email, company_phone, company_website, company_address,
              primary_color, secondary_color, logo_url)
    ON public.organizations TO authenticated;

GRANT SELECT,
      INSERT (organization_id, email, role, invited_by, token, expires_at),
      UPDATE (status)
    ON public.invitations TO authenticated;

GRANT SELECT,
      INSERT (organization_id, user_id, action, resource_type, resource_id, metadata)
    ON public.activity_log TO authenticated;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------

-- Profiles: yourself and members of your organization
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR organization_id = public.current_org_id());

CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() AND lower(email) = public.auth_email());

CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Organizations: your own, plus ones with a pending invitation to you
CREATE POLICY organizations_select ON public.organizations FOR SELECT TO authenticated
    USING (
        id = public.current_org_id()
        OR id IN (SELECT organization_id FROM public.invitations
                  WHERE status = 'pending' AND lower(email) = public.auth_email())
    );

CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated
    USING (id = public.current_org_id() AND public.current_org_role() IN ('owner', 'admin'))
    WITH CHECK (id = public.current_org_id());

-- Invitations: your org's, or addressed to you
CREATE POLICY invitations_select ON public.invitations FOR SELECT TO authenticated
    USING (organization_id = public.current_org_id() OR lower(email) = public.auth_email());

CREATE POLICY invitations_insert ON public.invitations FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.current_org_id()
        AND public.current_org_role() IN ('owner', 'admin')
        AND invited_by = auth.uid()
        AND expires_at <= now() + interval '30 days'
    );

-- Admins cancel, invitees decline; both only ever set status = 'cancelled'
CREATE POLICY invitations_update ON public.invitations FOR UPDATE TO authenticated
    USING (
        (organization_id = public.current_org_id() AND public.current_org_role() IN ('owner', 'admin'))
        OR lower(email) = public.auth_email()
    )
    WITH CHECK (status = 'cancelled');

CREATE POLICY activity_log_select ON public.activity_log FOR SELECT TO authenticated
    USING (organization_id = public.current_org_id());

CREATE POLICY activity_log_insert ON public.activity_log FOR INSERT TO authenticated
    WITH CHECK (organization_id = public.current_org_id() AND user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Membership functions (the only way to change organization_id / role)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_organization(p_name text, p_subdomain text)
RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org public.organizations;
BEGIN
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

-- Readable before sign-in: the token itself is the secret
CREATE OR REPLACE FUNCTION public.get_invitation(p_token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT jsonb_build_object(
        'email', i.email, 'role', i.role, 'status', i.status, 'expires_at', i.expires_at,
        'organizations', jsonb_build_object('name', o.name))
    FROM public.invitations i JOIN public.organizations o ON o.id = i.organization_id
    WHERE i.token = p_token
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    inv public.invitations;
    me  public.profiles;
BEGIN
    SELECT * INTO inv FROM public.invitations WHERE token = p_token FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
    IF inv.status <> 'pending' THEN RAISE EXCEPTION 'Invitation is no longer valid'; END IF;
    IF inv.expires_at < now() THEN RAISE EXCEPTION 'Invitation expired'; END IF;
    IF lower(inv.email) IS DISTINCT FROM public.auth_email() THEN
        RAISE EXCEPTION 'This invitation was sent to a different email address';
    END IF;

    SELECT * INTO me FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    IF me.role = 'owner' AND me.organization_id IS NOT NULL THEN
        RAISE EXCEPTION 'Organization owners cannot join another organization';
    END IF;

    PERFORM 1 FROM public.organizations o WHERE o.id = inv.organization_id
        AND (SELECT count(*) FROM public.profiles p WHERE p.organization_id = o.id) >= o.max_users;
    IF FOUND THEN RAISE EXCEPTION 'Organization has reached its member limit'; END IF;

    UPDATE public.profiles SET organization_id = inv.organization_id, role = inv.role WHERE id = me.id;
    UPDATE public.invitations SET status = 'accepted' WHERE id = inv.id;
END $$;

-- Owners manage everyone, admins manage non-owners; nobody changes their own role
CREATE OR REPLACE FUNCTION public.set_member_role(p_member_id uuid, p_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF p_role NOT IN ('admin', 'designer', 'viewer') THEN RAISE EXCEPTION 'Invalid role'; END IF;

    UPDATE public.profiles m SET role = p_role
    WHERE m.id = p_member_id
      AND m.id <> auth.uid()
      AND m.organization_id = public.current_org_id()
      AND (public.current_org_role() = 'owner'
           OR (public.current_org_role() = 'admin' AND m.role <> 'owner'));
    IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed to change this member''s role'; END IF;
END $$;

-- Leave (yourself) or remove (owner/admin); the owner can't leave or be removed
CREATE OR REPLACE FUNCTION public.remove_member(p_member_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    UPDATE public.profiles m SET organization_id = NULL, role = 'designer'
    WHERE m.id = p_member_id
      AND m.role <> 'owner'
      AND m.organization_id = public.current_org_id()
      AND (m.id = auth.uid() OR public.current_org_role() IN ('owner', 'admin'));
    IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed to remove this member'; END IF;
END $$;

-- Previously let any caller write log entries into any organization
CREATE OR REPLACE FUNCTION public.log_activity(
    p_organization_id uuid,
    p_action text,
    p_resource_type text DEFAULT NULL,
    p_resource_id uuid DEFAULT NULL,
    p_metadata jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_log_id uuid;
BEGIN
    IF p_organization_id IS DISTINCT FROM public.current_org_id() THEN
        RAISE EXCEPTION 'Not a member of this organization';
    END IF;
    INSERT INTO public.activity_log (organization_id, user_id, action, resource_type, resource_id, metadata)
    VALUES (p_organization_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata)
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
END $$;

-- Supabase grants EXECUTE on new functions to anon by default
REVOKE EXECUTE ON FUNCTION
    public.current_org_id(), public.current_org_role(), public.auth_email(),
    public.create_organization(text, text), public.get_invitation(text),
    public.accept_invitation(text), public.set_member_role(uuid, text),
    public.remove_member(uuid), public.log_activity(uuid, text, text, uuid, jsonb)
    FROM public, anon;
GRANT EXECUTE ON FUNCTION
    public.current_org_id(), public.current_org_role(), public.auth_email(),
    public.create_organization(text, text), public.get_invitation(text),
    public.accept_invitation(text), public.set_member_role(uuid, text),
    public.remove_member(uuid), public.log_activity(uuid, text, text, uuid, jsonb)
    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation(text) TO anon;

-- ----------------------------------------------------------------------------
-- Logo bucket: raster images only (SVG in a public bucket = stored XSS)
-- ----------------------------------------------------------------------------

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'organization-logos';

COMMIT;
