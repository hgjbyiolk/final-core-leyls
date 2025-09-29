/*
  # Fix Support Agent Foreign Key Relationship

  1. Schema Changes
    - Drop existing FK constraint from support_agents to auth.users
    - Add new FK constraint from support_agents.id to public.users.id
    - Update RLS policies to avoid infinite recursion
    - Add proper sync between auth.users and public.users

  2. Data Integrity
    - Ensure all support agents have corresponding public.users records
    - Clean up any orphaned records
    - Add proper indexes for performance

  3. Security
    - Update RLS policies to use public.users FK relationship
    - Remove recursive policy dependencies
    - Ensure support agents can access all necessary data
*/

-- First, ensure we have a proper sync function for auth.users -> public.users
CREATE OR REPLACE FUNCTION sync_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update public.users when auth.users changes
  INSERT INTO public.users (
    id, 
    email, 
    user_metadata, 
    role,
    is_super_admin,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.user_metadata, '{}'),
    COALESCE(NEW.user_metadata->>'role', COALESCE(NEW.app_metadata->>'role', 'restaurant_owner')),
    COALESCE((NEW.app_metadata->>'is_super_admin')::boolean, false),
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    role = COALESCE(EXCLUDED.user_metadata->>'role', COALESCE(NEW.app_metadata->>'role', 'restaurant_owner')),
    is_super_admin = COALESCE((NEW.app_metadata->>'is_super_admin')::boolean, false),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync auth.users to public.users
DROP TRIGGER IF EXISTS sync_auth_users_trigger ON auth.users;
CREATE TRIGGER sync_auth_users_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_users();

-- Sync existing auth.users to public.users
INSERT INTO public.users (id, email, user_metadata, role, is_super_admin, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.user_metadata, '{}'),
  COALESCE(au.user_metadata->>'role', COALESCE(au.app_metadata->>'role', 'restaurant_owner')),
  COALESCE((au.app_metadata->>'is_super_admin')::boolean, false),
  au.created_at,
  NOW()
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  user_metadata = EXCLUDED.user_metadata,
  role = COALESCE(EXCLUDED.user_metadata->>'role', COALESCE(auth.users.app_metadata->>'role', 'restaurant_owner')),
  is_super_admin = COALESCE((auth.users.app_metadata->>'is_super_admin')::boolean, false),
  updated_at = NOW()
FROM auth.users
WHERE auth.users.id = public.users.id;

-- Drop the existing FK constraint to auth.users
ALTER TABLE support_agents DROP CONSTRAINT IF EXISTS support_agents_id_fkey;

-- Add new FK constraint to public.users
ALTER TABLE support_agents 
ADD CONSTRAINT support_agents_id_fkey 
FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Clean up orphaned support_agents records (those without public.users records)
DELETE FROM support_agents 
WHERE id NOT IN (SELECT id FROM public.users WHERE role = 'support');

-- Update support_agents role constraint to match new naming
ALTER TABLE support_agents DROP CONSTRAINT IF EXISTS support_agents_role_check;
ALTER TABLE support_agents 
ADD CONSTRAINT support_agents_role_check 
CHECK (role = 'support_agent');

-- Update RLS policies to avoid infinite recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Support agents can read own profile" ON users;
DROP POLICY IF EXISTS "Support agents can manage own profile" ON users;

-- Add new non-recursive policies for support agents
CREATE POLICY "Support agents can read own user profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    AND role = 'support'
  );

CREATE POLICY "Support agents can update own user profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() 
    AND role = 'support'
  )
  WITH CHECK (
    id = auth.uid() 
    AND role = 'support'
  );

-- Update support_agents policies to use public.users FK
DROP POLICY IF EXISTS "Support agents can manage own profile" ON support_agents;

CREATE POLICY "Support agents can read own support profile"
  ON support_agents
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Support agents can update own support profile"
  ON support_agents
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create improved RPC function for getting support agents with proper FK join
CREATE OR REPLACE FUNCTION get_support_agents_with_users()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  is_active boolean,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    sa.name,
    u.email,
    u.role,
    sa.is_active,
    sa.last_login_at,
    u.created_at,
    sa.updated_at
  FROM public.users u
  INNER JOIN support_agents sa ON sa.id = u.id
  WHERE u.role = 'support'
  ORDER BY sa.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_support_agents_with_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_support_agents_with_users() TO service_role;

-- Create function to check if user is support agent (non-recursive)
CREATE OR REPLACE FUNCTION is_support_agent()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'support'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_support_agent() TO authenticated;
GRANT EXECUTE ON FUNCTION is_support_agent() TO service_role;

-- Create function to set support agent context for RLS
CREATE OR REPLACE FUNCTION set_support_agent_context(agent_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the current support agent context for RLS policies
  PERFORM set_config('app.current_support_agent_email', agent_email, true);
  
  -- Also set a flag that this is a support agent session
  PERFORM set_config('app.is_support_agent_session', 'true', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_support_agent_context(text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_support_agent_context(text) TO service_role;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role_support ON users(role) WHERE role = 'support';
CREATE INDEX IF NOT EXISTS idx_support_agents_active ON support_agents(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_support_agents_email_active ON support_agents(id, is_active) WHERE is_active = true;

-- Ensure all existing support agents have proper public.users records
INSERT INTO public.users (id, email, role, user_metadata, created_at, updated_at)
SELECT 
  sa.id,
  sa.email,
  'support',
  jsonb_build_object('name', sa.name, 'role', 'support'),
  sa.created_at,
  NOW()
FROM support_agents sa
WHERE sa.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET
  role = 'support',
  user_metadata = jsonb_build_object('name', support_agents.name, 'role', 'support'),
  updated_at = NOW()
FROM support_agents
WHERE support_agents.id = public.users.id;