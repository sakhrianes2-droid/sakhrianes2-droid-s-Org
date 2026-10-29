-- ==============================================================================
-- Supernova Macroeconomic Intelligence & Enclave Security Schema
-- Migration: 001_initial_schema.sql
-- Description: Complete idempotent schema for User Profiles, Audit Logs,
--              Beta Whitelist Requests, User Alerts, Pipeline Configs, and
--              Shared Institutional Macro Intelligence.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USER PROFILES (public.profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    firm TEXT,
    role TEXT DEFAULT 'trader' CHECK (role IN ('trader', 'admin')),
    tier TEXT DEFAULT 'QUANT_PRO',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for public.profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;
CREATE POLICY "Service role full access on profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to handle new user registration from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_full_name TEXT;
    user_firm TEXT;
    user_role TEXT;
    user_tier TEXT;
BEGIN
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    user_firm := COALESCE(
        NEW.raw_user_meta_data->>'firm',
        NEW.raw_user_meta_data->>'company',
        'Independent Quant Desk'
    );
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'trader');
    IF user_role NOT IN ('trader', 'admin') THEN
        user_role := 'trader';
    END IF;
    user_tier := COALESCE(NEW.raw_user_meta_data->>'tier', 'QUANT_PRO');

    INSERT INTO public.profiles (id, email, full_name, firm, role, tier, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_firm,
        user_role,
        user_tier,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        firm = COALESCE(EXCLUDED.firm, public.profiles.firm),
        updated_at = now();

    RETURN NEW;
END;
$$;

-- Trigger on auth.users for profile generation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);


-- ==============================================================================
-- 2. AUTHENTICATION & ACCESS AUDIT LOGS (public.auth_activity_logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.auth_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN ('SIGN_IN', 'SIGN_OUT', 'SIGN_UP', 'ACCESS_REQUEST', 'TOKEN_REFRESH', 'ACCESS_DENIED')
    ),
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PENDING', 'FLAGGED')),
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.auth_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read their own logs (by user_id or email claim)
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.auth_activity_logs;
CREATE POLICY "Users can view own audit logs"
    ON public.auth_activity_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR
        email = auth.jwt()->>'email'
    );

-- RLS: Allow authenticated users to INSERT their own logs,
-- AND allow anon/authenticated to INSERT ACCESS_REQUEST, ACCESS_DENIED, or SIGN_UP
DROP POLICY IF EXISTS "Allow user activity logging" ON public.auth_activity_logs;
CREATE POLICY "Allow user activity logging"
    ON public.auth_activity_logs
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR user_id IS NULL))
        OR
        (event_type IN ('ACCESS_REQUEST', 'ACCESS_DENIED', 'SIGN_UP'))
    );

-- RLS: Admins can view all activity logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.auth_activity_logs;
CREATE POLICY "Admins can view all audit logs"
    ON public.auth_activity_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- RLS: Service role full access
DROP POLICY IF EXISTS "Service role full access on audit logs" ON public.auth_activity_logs;
CREATE POLICY "Service role full access on audit logs"
    ON public.auth_activity_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.auth_activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON public.auth_activity_logs (event_type);


-- ==============================================================================
-- 3. BETA ACCESS & WHITELIST REQUESTS (public.beta_access_requests)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.beta_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    firm TEXT NOT NULL,
    role TEXT NOT NULL,
    volume_tier TEXT,
    strategy TEXT,
    notes TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.beta_access_requests ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated to submit requests
DROP POLICY IF EXISTS "Anyone can insert beta access requests" ON public.beta_access_requests;
CREATE POLICY "Anyone can insert beta access requests"
    ON public.beta_access_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow users to view their own request by email or admins to view all
DROP POLICY IF EXISTS "Users can view own beta request or admins view all" ON public.beta_access_requests;
CREATE POLICY "Users can view own beta request or admins view all"
    ON public.beta_access_requests
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt()->>'email' = email)
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on beta requests" ON public.beta_access_requests;
CREATE POLICY "Service role full access on beta requests"
    ON public.beta_access_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_beta_requests_email ON public.beta_access_requests (email);
CREATE INDEX IF NOT EXISTS idx_beta_requests_ticket ON public.beta_access_requests (ticket_number);


-- ==============================================================================
-- 4. USER-SCOPED ALERTS (public.alerts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    condition_op TEXT NOT NULL,
    benchmark TEXT NOT NULL,
    variance DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Full CRUD restricted to auth.uid() = user_id
DROP POLICY IF EXISTS "Users have full CRUD on own alerts" ON public.alerts;
CREATE POLICY "Users have full CRUD on own alerts"
    ON public.alerts
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on alerts" ON public.alerts;
CREATE POLICY "Service role full access on alerts"
    ON public.alerts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts (user_id);


-- ==============================================================================
-- 5. USER PIPELINE CONFIGURATIONS (public.pipeline_configs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_configs (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_synced_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pipeline_configs ENABLE ROW LEVEL SECURITY;

-- Full CRUD restricted to auth.uid() = user_id
DROP POLICY IF EXISTS "Users have full CRUD on own pipeline configs" ON public.pipeline_configs;
CREATE POLICY "Users have full CRUD on own pipeline configs"
    ON public.pipeline_configs
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on pipeline configs" ON public.pipeline_configs;
CREATE POLICY "Service role full access on pipeline configs"
    ON public.pipeline_configs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ==============================================================================
-- 6. SHARED MACROECONOMIC INTELLIGENCE (biases, global_index, central_banks)
-- ==============================================================================

-- A. Asset Biases
CREATE TABLE IF NOT EXISTS public.biases (
    asset_class TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    bias TEXT NOT NULL,
    confidence_score INTEGER NOT NULL,
    key_drivers JSONB DEFAULT '[]'::jsonb,
    ai_summary TEXT,
    latest_news JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.biases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read biases" ON public.biases;
CREATE POLICY "Anyone can read biases"
    ON public.biases
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role full access on biases" ON public.biases;
CREATE POLICY "Service role full access on biases"
    ON public.biases
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- B. Global Index
CREATE TABLE IF NOT EXISTS public.global_index (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    date TEXT NOT NULL,
    score INTEGER NOT NULL,
    label TEXT NOT NULL,
    summary TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.global_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read global index" ON public.global_index;
CREATE POLICY "Anyone can read global index"
    ON public.global_index
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role full access on global index" ON public.global_index;
CREATE POLICY "Service role full access on global index"
    ON public.global_index
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- C. Central Bank Policies
CREATE TABLE IF NOT EXISTS public.central_banks (
    bank_key TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.central_banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read central banks" ON public.central_banks;
CREATE POLICY "Anyone can read central banks"
    ON public.central_banks
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role full access on central banks" ON public.central_banks;
CREATE POLICY "Service role full access on central banks"
    ON public.central_banks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Enable Realtime publication for tables that support live subscriptions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_activity_logs;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.biases;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.global_index;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.central_banks;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;
