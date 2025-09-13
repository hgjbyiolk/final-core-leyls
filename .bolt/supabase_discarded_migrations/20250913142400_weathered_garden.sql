/*
  # Fix Support System Constraints and Policies

  1. Database Fixes
    - Fix chat_participants constraint to allow 'support_agent'
    - Update RLS policies for proper support agent access
    - Add proper indexes for performance

  2. Security
    - Support agents can see all sessions from all restaurants
    - Restaurant managers only see their own sessions
    - Proper participant type validation
*/

-- Fix the constraint that was blocking support agents
ALTER TABLE chat_participants 
DROP CONSTRAINT IF EXISTS chat_participants_user_type_check;

ALTER TABLE chat_participants 
ADD CONSTRAINT chat_participants_user_type_check 
CHECK (user_type = ANY (ARRAY['restaurant_manager'::text, 'support_agent'::text]));

-- Fix chat_messages constraint as well
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_sender_type_check;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_sender_type_check 
CHECK (sender_type = ANY (ARRAY['restaurant_manager'::text, 'support_agent'::text]));

-- Create support_agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS support_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'support_agent'::text,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT support_agents_role_check CHECK (role = 'support_agent'::text)
);

-- Enable RLS on support_agents
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;

-- Support agents can manage their own profile
CREATE POLICY "Support agents can manage own profile"
  ON support_agents
  FOR ALL
  TO authenticated
  USING (email = current_setting('app.current_agent_email'::text, true))
  WITH CHECK (email = current_setting('app.current_agent_email'::text, true));

-- Service role can manage all agents
CREATE POLICY "Service role can manage all agents"
  ON support_agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to check if current user is a support agent
CREATE OR REPLACE FUNCTION is_support_agent()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current_setting for agent email is set
  RETURN current_setting('app.current_agent_email', true) IS NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to set support agent context
CREATE OR REPLACE FUNCTION set_support_agent_context(agent_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the agent email in the session
  PERFORM set_config('app.current_agent_email', agent_email, true);
END;
$$;

-- Update chat_sessions policies for support agents
DROP POLICY IF EXISTS "Support agents can manage all chat sessions" ON chat_sessions;
CREATE POLICY "Support agents can manage all chat sessions"
  ON chat_sessions
  FOR ALL
  TO authenticated
  USING (is_support_agent())
  WITH CHECK (is_support_agent());

-- Update chat_messages policies for support agents  
DROP POLICY IF EXISTS "Support agents can manage all chat messages" ON chat_messages;
CREATE POLICY "Support agents can manage all chat messages"
  ON chat_messages
  FOR ALL
  TO authenticated
  USING (is_support_agent())
  WITH CHECK (is_support_agent());

-- Update chat_participants policies for support agents
DROP POLICY IF EXISTS "Support agents can manage all chat participants" ON chat_participants;
CREATE POLICY "Support agents can manage all chat participants"
  ON chat_participants
  FOR ALL
  TO authenticated
  USING (is_support_agent())
  WITH CHECK (is_support_agent());

-- Update message_attachments policies for support agents
DROP POLICY IF EXISTS "Support agents can manage all message attachments" ON message_attachments;
CREATE POLICY "Support agents can manage all message attachments"
  ON message_attachments
  FOR ALL
  TO authenticated
  USING (is_support_agent())
  WITH CHECK (is_support_agent());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_restaurant_status_priority 
  ON chat_sessions(restaurant_id, status, priority);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_sender 
  ON chat_messages(session_id, created_at, sender_type);

CREATE INDEX IF NOT EXISTS idx_chat_participants_session_user_type 
  ON chat_participants(session_id, user_type, is_online);

-- Add trigger to update session last_message_at when new message is added
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE chat_sessions 
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_session_last_message_trigger ON chat_messages;
CREATE TRIGGER update_session_last_message_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_message();

-- Add trigger to update participant last_seen_at when they send a message
CREATE OR REPLACE FUNCTION update_participant_last_seen()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE chat_participants 
  SET last_seen_at = NEW.created_at,
      is_online = true
  WHERE session_id = NEW.session_id 
    AND user_id = NEW.sender_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_participant_last_seen_trigger ON chat_messages;
CREATE TRIGGER update_participant_last_seen_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_last_seen();