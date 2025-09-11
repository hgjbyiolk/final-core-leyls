/*
  # Finalize Support System Setup

  1. Functions for support agent detection
  2. RLS policies for chats & messages
  3. Real-time triggers for chat performance
*/

-- Function to check if current user is a support agent
CREATE OR REPLACE FUNCTION is_support_agent()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current_agent_email is set (for support portal)
  IF current_setting('app.current_agent_email', true) IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM support_agents 
      WHERE email = current_setting('app.current_agent_email', true) 
      AND is_active = true
    );
  END IF;
  
  -- Check if authenticated user is in support_agents table
  IF auth.uid() IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM support_agents sa
      JOIN auth.users u ON u.email = sa.email
      WHERE u.id = auth.uid() AND sa.is_active = true
    );
  END IF;
  
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
  PERFORM set_config('app.current_agent_email', agent_email, true);
END;
$$;

-- Policies for chat_sessions
DROP POLICY IF EXISTS "Support agents can manage all chat sessions" ON chat_sessions;
CREATE POLICY "Support agents can manage all chat sessions" ON chat_sessions
  FOR ALL TO authenticated
  USING (is_support_agent())
  WITH CHECK (is_support_agent());

-- Policies for chat_messages
DROP POLICY IF EXISTS "Support agents can manage all chat messages" ON chat_messages;
CREATE POLICY "Support agents can manage all chat messages" ON chat_messages
  FOR ALL TO authenticated
  USING (is_support_agent())
  WITH CHECK (is_support_agent());

-- Policies for chat_participants
DROP POLICY IF EXISTS "Support agents can manage all chat participants" ON chat_participants;
CREATE POLICY "Support agents can manage all chat participants" ON chat_participants
  FOR ALL TO authenticated
  USING (is_support_agent())
  WITH CHECK (is_support_agent());

-- Policies for message_attachments
DROP POLICY IF EXISTS "Support agents can manage all message attachments" ON message_attachments;
CREATE POLICY "Support agents can manage all message attachments" ON message_attachments
  FOR ALL TO authenticated
  USING (is_support_agent())
  WITH CHECK (is_support_agent());

-- Real-time trigger: update last_message_at
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE chat_sessions 
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$;

-- Real-time trigger: update participant last_seen
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
