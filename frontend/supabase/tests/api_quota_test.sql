-- Checks consume_api_call() and the guest-demo rules after all migrations ran.
-- Every failed ASSERT aborts with a message; run with ON_ERROR_STOP=1.

-- One account, two guests (the trigger creates their profiles)
INSERT INTO auth.users (id, email, is_anonymous) VALUES
    ('00000000-0000-0000-0000-000000000001', 'designer@example.com', false),
    ('00000000-0000-0000-0000-000000000002', 'owner@example.com', false),
    ('00000000-0000-0000-0000-0000000000a1', NULL, true),
    ('00000000-0000-0000-0000-0000000000a2', NULL, true),
    ('00000000-0000-0000-0000-0000000000a3', NULL, true);

DO $$
BEGIN
    ASSERT (SELECT count(*) FROM public.profiles WHERE email IS NULL) = 3,
        'guest sign-ups must get a profile without an email';
END $$;

-- Calls run as the API would: role authenticated, claims of the signed-in user
CREATE FUNCTION pg_temp.call_as(sub text, anonymous boolean) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE allowed boolean;
BEGIN
    PERFORM set_config('request.jwt.claims',
        json_build_object('sub', sub, 'is_anonymous', anonymous)::text, true);
    SET LOCAL ROLE authenticated;
    allowed := public.consume_api_call();
    RESET ROLE;
    RETURN allowed;
END $$;

DO $$
DECLARE
    account constant text := '00000000-0000-0000-0000-000000000001';
    guest   constant text := '00000000-0000-0000-0000-0000000000a1';
BEGIN
    FOR i IN 1..500 LOOP
        ASSERT pg_temp.call_as(account, false), format('account call %s must pass', i);
    END LOOP;
    ASSERT NOT pg_temp.call_as(account, false), 'account call 501 must be refused';

    FOR i IN 1..60 LOOP
        ASSERT pg_temp.call_as(guest, true), format('guest call %s must pass', i);
    END LOOP;
    ASSERT NOT pg_temp.call_as(guest, true), 'guest call 61 must be refused';
END $$;

-- The shared guest cap: pretend other guests already used 1,480 calls today;
-- a retrying guest's own overage (61+) must not count against it
UPDATE public.api_usage SET calls = 1480
WHERE user_id = '00000000-0000-0000-0000-0000000000a1';

DO $$
DECLARE guest2 constant text := '00000000-0000-0000-0000-0000000000a2';
BEGIN
    -- a1 counts as min(1480, 60) = 60, so guest a2 still has its full 60
    FOR i IN 1..60 LOOP
        ASSERT pg_temp.call_as(guest2, true), format('second guest call %s must pass', i);
    END LOOP;
END $$;

-- 24 more guests used their full 60 today: 26 x 60 = 1,560 > the 1,500 shared cap
INSERT INTO auth.users (id, is_anonymous)
SELECT ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid, true
FROM generate_series(1, 24) AS i;
INSERT INTO public.api_usage (user_id, calls, is_anonymous)
SELECT id, 60, true FROM auth.users WHERE id::text LIKE '00000000-0000-0000-0000-0000000001%';

DO $$
BEGIN
    ASSERT NOT pg_temp.call_as('00000000-0000-0000-0000-0000000000a3', true),
        'a fresh guest must be refused once all guests hit the shared cap';
    -- Accounts are unaffected by the guest cap
    ASSERT pg_temp.call_as('00000000-0000-0000-0000-000000000002', false),
        'accounts must not be limited by the guest cap';
END $$;

DO $$
BEGIN
    -- Without a signed-in user nothing is allowed
    PERFORM set_config('request.jwt.claims', '{}', true);
    SET LOCAL ROLE authenticated;
    ASSERT NOT public.consume_api_call(), 'calls without a user must be refused';
    RESET ROLE;
END $$;

-- Clients can't read or reset their usage directly
DO $$
BEGIN
    SET LOCAL ROLE authenticated;
    BEGIN
        PERFORM 1 FROM public.api_usage;
        RAISE EXCEPTION 'authenticated must not read api_usage';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
    RESET ROLE;
END $$;

-- Guests can't create organizations
DO $$
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "00000000-0000-0000-0000-0000000000a1", "is_anonymous": true}', true);
    SET LOCAL ROLE authenticated;
    BEGIN
        PERFORM public.create_organization('Guest Org', 'guest-org');
        RAISE EXCEPTION 'guests must not create organizations';
    EXCEPTION WHEN raise_exception THEN
        ASSERT SQLERRM = 'Create an account to set up an organization', SQLERRM;
    END;
    RESET ROLE;
END $$;

SELECT 'api quota tests passed' AS result;
