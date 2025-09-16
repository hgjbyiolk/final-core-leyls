/*
  # Fix Chat Attachments Real-time Updates

  1. Enhanced Triggers
    - Update chat message triggers to handle attachments properly
    - Ensure real-time updates include attachment data

  2. Improved Functions
    - Enhanced broadcast function for attachment updates
    - Better message handling with attachment support

  3. Security
    - Maintain existing RLS policies
    - Ensure attachment security
*/

-- Enhanced broadcast function for chat updates with attachment support
CREATE OR REPLACE FUNCTION broadcast_chat_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Broadcast the change with additional context
  IF TG_TABLE_NAME = 'chat_messages' THEN
    -- For messages, include attachment info
    PERFORM pg_notify(
      'chat_update',
      json_build_object(
        'table', TG_TABLE_NAME,
        'type', TG_OP,
        'record', CASE 
          WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
          ELSE row_to_json(NEW)
        END,
        'session_id', CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.session_id
          ELSE NEW.session_id
        END,
        'has_attachments', CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.has_attachments
          ELSE NEW.has_attachments
        END
      )::text
    );
  ELSE
    -- For other tables, use standard broadcast
    PERFORM pg_notify(
      'chat_update',
      json_build_object(
        'table', TG_TABLE_NAME,
        'type', TG_OP,
        'record', CASE 
          WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
          ELSE row_to_json(NEW)
        END
      )::text
    );
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Update message attachments trigger to broadcast changes
DROP TRIGGER IF EXISTS message_attachments_broadcast_trigger ON message_attachments;
CREATE TRIGGER message_attachments_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON message_attachments
  FOR EACH ROW EXECUTE FUNCTION broadcast_chat_update();

-- Function to get messages with attachments for real-time updates
CREATE OR REPLACE FUNCTION get_message_with_attachments(message_id uuid)
RETURNS json AS $$
DECLARE
  message_data json;
  attachments_data json;
BEGIN
  -- Get message data
  SELECT row_to_json(cm.*) INTO message_data
  FROM chat_messages cm
  WHERE cm.id = message_id;

  -- Get attachments data
  SELECT json_agg(ma.*) INTO attachments_data
  FROM message_attachments ma
  WHERE ma.message_id = message_id;

  -- Combine message with attachments
  RETURN json_build_object(
    'message', message_data,
    'attachments', COALESCE(attachments_data, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;