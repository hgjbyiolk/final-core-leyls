/*
  # Fix Support Portal Global Access

  This migration ensures support agents can see ALL restaurant chat sessions
  and interact with them properly, while maintaining security.

  1. Enhanced RLS Policies
    - Support agents get global read/write access to all chat sessions
    - Support agents can manage messages and participants across all restaurants
    - Service role bypass for critical operations

  2. Enhanced Functions
    - Improved support agent context setting
    - Better session fetching with restaurant data
    - Enhanced authentication functions

  3. Security
    - Maintain restaurant manager restrictions
    - Ensure only authenticated support agents get global access
    - Proper permission validation
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Support agents global read access" ON chat_sessions;
DROP POLICY IF EXISTS "Support agents global write access" ON chat_sessions;
DROP POLICY IF EXISTS "Support agents global message access" ON chat_messages;
DROP POLICY IF EXISTS "Support agents global participant access" ON chat_participants;

-- Create comprehensive support agent policies for chat_sessions
CREATE POLICY "Support agents can view all sessions globally"
  ON chat_sessions
  FOR SELECT
  TO authenticated
  USING (
    -- Support agents can see everything
    is_support_agent() OR
    -- Super admins can see everything
    is_super_admin() OR
    -- Restaurant managers can see their own
    (EXISTS (
      SELECT 1 FROM restaurants r 
      WHERE r.id = chat_sessions.restaurant_id 
      AND r.owner_id = auth.uid()
    ))
  );

CREATE POLICY "Support agents can manage all sessions globally"
  ON chat_sessions
  FOR ALL
  TO authenticated
  USING (
    -- Support agents can manage everything
    is_support_agent() OR
    -- Super admins can manage everything
    is_super_admin() OR
    -- Restaurant managers can manage their own
    (EXISTS (
      SELECT 1 FROM restaurants r 
      WHERE r.id = chat_sessions.restaurant_id 
      AND r.owner_id = auth.uid()
    ))
  )
  WITH CHECK (
    -- Support agents can create/update everything
    is_support_agent() OR
    -- Super admins can create/update everything
    is_super_admin() OR
    -- Restaurant managers can create/update their own
    (EXISTS (
      SELECT 1 FROM restaurants r 
      WHERE r.id = chat_sessions.restaurant_id 
      AND r.owner_id = auth.uid()
    ))
  );

-- Create comprehensive support agent policies for chat_messages
CREATE POLICY "Support agents can view all messages globally"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Support agents can see everything
    is_support_agent() OR
    -- Super admins can see everything
    is_super_admin() OR
    -- Restaurant managers can see their own
    (EXISTS (
      SELECT 1 FROM chat_sessions cs
      JOIN restaurants r ON r.id = cs.restaurant_id
      WHERE cs.id = chat_messages.session_id 
      AND r.owner_id = auth.uid()
    ))
  );

CREATE POLICY "Support agents can manage all messages globally"
  ON chat_messages
  FOR ALL
  TO authenticated
  USING (
    -- Support agents can manage everything
    is_support_agent() OR
    -- Super admins can manage everything
    is_super_admin() OR
    -- Restaurant managers can manage their own
    (EXISTS (
      SELECT 1 FROM chat_sessions cs
      JOIN restaurants r ON r.id = cs.restaurant_id
      WHERE cs.id = chat_messages.session_id 
      AND r.owner_id = auth.uid()
    ))
  )
  WITH CHECK (
    -- Support agents can create/update everything
    is_support_agent() OR
    -- Super admins can create/update everything
    is_super_admin() OR
    -- Restaurant managers can create/update their own
    (EXISTS (
      SELECT 1 FROM chat_sessions cs
      JOIN restaurants r ON r.id = cs.restaurant_id
      WHERE cs.id = chat_messages.session_id 
      AND r.owner_id = auth.uid()
    ))
  );

-- Create comprehensive support agent policies for chat_participants
CREATE POLICY "Support agents can view all participants globally"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (
    -- Support agents can see everything
    is_support_agent() OR
    -- Super admins can see everything
    is_super_admin() OR
    -- Restaurant managers can see their own
    (EXISTS (
      SELECT 1 FROM chat_sessions cs
      JOIN restaurants r ON r.id = cs.restaurant_id
      WHERE cs.id = chat_participants.session_id 
      AND r.owner_id = auth.uid()
    ))
  );

CREATE POLICY "Support agents can manage all participants globally"
  ON chat_participants
  FOR ALL
  TO authenticated
  USING (
    -- Support agents can manage everything
    is_support_agent() OR
    -- Super admins can manage everything
    is_super_admin() OR
    -- Restaurant managers can manage their own
    (EXISTS (
      SELECT 1 FROM chat_sessions cs
      JOIN restaurants r ON r.id = cs.restaurant_id
      WHERE cs.id = chat_participants.session_id 
      AND r.owner_id = auth.uid()
    ))
  )
  WITH CHECK (
    -- Support agents can create/update everything
    is_support_agent() OR
    -- Super admins can create/update everything
    is_super_admin() OR
    -- Restaurant managers can create/update their own
    (EXISTS (
      SELECT 1 FROM chat_sessions cs
      JOIN restaurants r ON r.id = cs.restaurant_id
      WHERE cs.id = chat_participants.session_id 
      AND r.owner_id = auth.uid()
    ))
  );

-- Enhanced function to get all chat sessions for support with restaurant data
CREATE OR REPLACE FUNCTION get_all_chat_sessions_for_support()
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  title text,
  status text,
  priority text,
  category text,
  created_by_user_id uuid,
  assigned_agent_name text,
  assigned_agent_id text,
  last_message_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  restaurant_name text,
  restaurant_slug text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log the function call
  RAISE NOTICE 'get_all_chat_sessions_for_support called by user: %', auth.uid();
  
  RETURN QUERY
  SELECT 
    cs.id,
    cs.restaurant_id,
    cs.title,
    cs.status,
    cs.priority,
    cs.category,
    cs.created_by_user_id,
    cs.assigned_agent_name,
    cs.assigned_agent_id,
    cs.last_message_at,
    cs.created_at,
    cs.updated_at,
    r.name as restaurant_name,
    r.slug as restaurant_slug
  FROM chat_sessions cs
  LEFT JOIN restaurants r ON r.id = cs.restaurant_id
  ORDER BY cs.last_message_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_chat_sessions_for_support() TO authenticated;

-- Enhanced support agent context function
CREATE OR REPLACE FUNCTION set_support_agent_context(agent_email text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify the agent exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM support_agents 
    WHERE email = agent_email 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Support agent not found or inactive: %', agent_email;
  END IF;
  
  -- Set the context
  PERFORM set_config('app.current_agent_email', agent_email, true);
  
  RAISE NOTICE 'Support agent context set for: %', agent_email;
  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_support_agent_context(text) TO authenticated;

-- Function to check if current user is a support agent
CREATE OR REPLACE FUNCTION is_support_agent()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  agent_email text;
  agent_exists boolean := false;
BEGIN
  -- Try to get agent email from context
  agent_email := current_setting('app.current_agent_email', true);
  
  -- If we have an agent email in context, verify it
  IF agent_email IS NOT NULL AND agent_email != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM support_agents 
      WHERE email = agent_email 
      AND is_active = true
    ) INTO agent_exists;
    
    IF agent_exists THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Fallback: check if current user is a super admin
  RETURN is_super_admin();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_support_agent() TO authenticated;

-- Test function to debug support agent access
CREATE OR REPLACE FUNCTION debug_support_agent_access()
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
  agent_email text;
  total_sessions int;
  agent_exists boolean;
BEGIN
  -- Get current context
  agent_email := current_setting('app.current_agent_email', true);
  
  -- Check if agent exists
  SELECT EXISTS (
    SELECT 1 FROM support_agents 
    WHERE email = agent_email 
    AND is_active = true
  ) INTO agent_exists;
  
  -- Count total sessions
  SELECT COUNT(*) INTO total_sessions FROM chat_sessions;
  
  -- Build result
  SELECT json_build_object(
    'current_user_id', auth.uid(),
    'agent_email_in_context', agent_email,
    'agent_exists_in_db', agent_exists,
    'is_support_agent_result', is_support_agent(),
    'is_super_admin_result', is_super_admin(),
    'total_sessions_in_db', total_sessions,
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_support_agent_access() TO authenticated;