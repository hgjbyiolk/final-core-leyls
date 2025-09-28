/*
  # Migrate Support Agents to Supabase Auth

  1. Database Changes
    - Add role column to users table for support agents
    - Create function to handle support agent creation via Supabase Auth
    - Update RLS policies for support agent access
    - Create migration function for existing support agents

  2. Security
    - Enable RLS on users table for support agents
    - Add policies for support agent management
    - Update quick_responses policies to use auth.role()

  3. Functions
    - Create helper functions for support agent management
    - Add role-based access control functions
*/

-- Add role column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'restaurant_owner';
  END IF;
END $$;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'support';

-- Function to get user role from JWT
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'role',
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'authenticated'
  );
$$;

-- Function to check if current user is support agent
CREATE OR REPLACE FUNCTION is_support_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.role() = 'support' OR 
         (auth.jwt() -> 'app_metadata' ->> 'role') = 'support' OR
         EXISTS (
           SELECT 1 FROM users 
           WHERE id = auth.uid() AND role = 'support'
         );
$$;

-- Update quick_responses policies to use proper auth role
DROP POLICY IF EXISTS "Support agents can read quick responses" ON quick_responses;
DROP POLICY IF EXISTS "Support agents can read all quick responses" ON quick_responses;

CREATE POLICY "Support agents can read quick responses"
ON quick_responses
FOR SELECT
TO authenticated
USING (
  is_support_agent() OR 
  auth.role() = 'support' OR
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'support'
);

-- Function to create support agent via Supabase Auth
CREATE OR REPLACE FUNCTION create_support_agent_auth(
  agent_name text,
  agent_email text,
  agent_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  result json;
BEGIN
  -- This function will be called from the edge function
  -- which has access to the admin client
  
  -- Insert into users table with support role
  INSERT INTO users (email, role, user_metadata)
  VALUES (
    agent_email,
    'support',
    jsonb_build_object('name', agent_name, 'role', 'support')
  )
  RETURNING id INTO new_user_id;
  
  -- Also insert into support_agents table for backward compatibility
  INSERT INTO support_agents (id, name, email, role, is_active)
  VALUES (new_user_id, agent_name, agent_email, 'support_agent', true)
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = now();
  
  result := json_build_object(
    'id', new_user_id,
    'name', agent_name,
    'email', agent_email,
    'role', 'support',
    'is_active', true,
    'created_at', now()
  );
  
  RETURN result;
END;
$$;

-- Function to authenticate support agent and return user data
CREATE OR REPLACE FUNCTION authenticate_support_agent_auth(
  agent_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_record record;
  result json;
BEGIN
  -- Get support agent from users table
  SELECT u.id, u.email, u.user_metadata->>'name' as name, u.role, u.created_at, u.updated_at
  INTO agent_record
  FROM users u
  WHERE u.email = agent_email 
    AND u.role = 'support'
    AND EXISTS (
      SELECT 1 FROM support_agents sa 
      WHERE sa.email = agent_email AND sa.is_active = true
    );
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Update last login
  UPDATE support_agents 
  SET last_login_at = now(), updated_at = now()
  WHERE email = agent_email;
  
  result := json_build_object(
    'id', agent_record.id,
    'name', agent_record.name,
    'email', agent_record.email,
    'role', agent_record.role,
    'is_active', true,
    'created_at', agent_record.created_at,
    'updated_at', agent_record.updated_at
  );
  
  RETURN result;
END;
$$;

-- Function to set support agent context (updated for auth users)
CREATE OR REPLACE FUNCTION set_support_agent_context(agent_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the agent exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM users u
    JOIN support_agents sa ON sa.email = u.email
    WHERE u.email = agent_email 
      AND u.role = 'support'
      AND sa.is_active = true
  ) THEN
    RAISE EXCEPTION 'Support agent not found or inactive: %', agent_email;
  END IF;
  
  -- Set the context for RLS policies
  PERFORM set_config('app.current_agent_email', agent_email, true);
  
  -- Also set a flag that this is a support agent session
  PERFORM set_config('app.is_support_agent', 'true', true);
END;
$$;

-- Update support agent policies to work with auth users
DROP POLICY IF EXISTS "Support agents can manage own profile" ON support_agents;

CREATE POLICY "Support agents can manage own profile"
ON support_agents
FOR ALL
TO authenticated
USING (
  email = (auth.jwt() ->> 'email') AND 
  (auth.role() = 'support' OR is_support_agent())
)
WITH CHECK (
  email = (auth.jwt() ->> 'email') AND 
  (auth.role() = 'support' OR is_support_agent())
);

-- Add policy for users table to allow support agents to read their own profile
CREATE POLICY IF NOT EXISTS "Support agents can read own profile"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid() AND role = 'support'
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_support_agent_auth TO service_role;
GRANT EXECUTE ON FUNCTION authenticate_support_agent_auth TO service_role;
GRANT EXECUTE ON FUNCTION set_support_agent_context TO authenticated;
GRANT EXECUTE ON FUNCTION is_support_agent TO authenticated;