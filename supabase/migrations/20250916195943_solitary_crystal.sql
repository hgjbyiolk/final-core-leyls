/*
  # Support Agent Authentication Functions

  1. Functions
    - `authenticate_support_agent` - Verify support agent credentials
    - `create_support_agent` - Create new support agent with hashed password
    - `set_support_agent_context` - Set agent context for session (optional)
    - `get_chat_statistics` - Get chat statistics for support portal
    - `get_recent_subscriptions` - Get recent subscriptions for super admin
    - `get_subscription_statistics` - Get subscription statistics
    - `get_system_wide_stats` - Get system-wide statistics

  2. Security
    - Password hashing using crypt extension
    - Secure authentication flow
    - Context setting for multi-tenant access
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to authenticate support agents
CREATE OR REPLACE FUNCTION authenticate_support_agent(
  agent_email TEXT,
  agent_password TEXT
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_record RECORD;
BEGIN
  -- Find the agent and verify password
  SELECT sa.* INTO agent_record
  FROM support_agents sa
  WHERE sa.email = agent_email 
    AND sa.is_active = true
    AND sa.password_hash = crypt(agent_password, sa.password_hash);
  
  IF agent_record.id IS NULL THEN
    -- Return empty result for invalid credentials
    RETURN;
  END IF;
  
  -- Return agent data (excluding password hash)
  RETURN QUERY
  SELECT 
    agent_record.id,
    agent_record.name,
    agent_record.email,
    agent_record.role,
    agent_record.is_active,
    agent_record.last_login_at,
    agent_record.created_at;
END;
$$;

-- Function to create support agents with hashed passwords
CREATE OR REPLACE FUNCTION create_support_agent(
  agent_name TEXT,
  agent_email TEXT,
  agent_password TEXT
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_agent_id UUID;
BEGIN
  -- Check if agent already exists
  IF EXISTS (SELECT 1 FROM support_agents WHERE email = agent_email) THEN
    RAISE EXCEPTION 'Support agent with email % already exists', agent_email;
  END IF;
  
  -- Insert new agent with hashed password
  INSERT INTO support_agents (name, email, password_hash, role, is_active)
  VALUES (
    agent_name,
    agent_email,
    crypt(agent_password, gen_salt('bf')),
    'support_agent',
    true
  )
  RETURNING support_agents.id INTO new_agent_id;
  
  -- Return the created agent data (excluding password)
  RETURN QUERY
  SELECT 
    sa.id,
    sa.name,
    sa.email,
    sa.role,
    sa.is_active,
    sa.created_at
  FROM support_agents sa
  WHERE sa.id = new_agent_id;
END;
$$;

-- Function to set support agent context (optional - for enhanced security)
CREATE OR REPLACE FUNCTION set_support_agent_context(agent_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the agent exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM support_agents 
    WHERE email = agent_email AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive support agent: %', agent_email;
  END IF;
  
  -- Set session variable for the agent
  PERFORM set_config('app.current_agent_email', agent_email, true);
  
  RETURN true;
END;
$$;

-- Function to get chat statistics
CREATE OR REPLACE FUNCTION get_chat_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_sessions INTEGER;
  active_sessions INTEGER;
  resolved_today INTEGER;
  total_restaurants INTEGER;
  agents_online INTEGER;
BEGIN
  -- Get total sessions
  SELECT COUNT(*) INTO total_sessions FROM chat_sessions;
  
  -- Get active sessions
  SELECT COUNT(*) INTO active_sessions FROM chat_sessions WHERE status = 'active';
  
  -- Get sessions resolved today
  SELECT COUNT(*) INTO resolved_today 
  FROM chat_sessions 
  WHERE status = 'resolved' 
    AND DATE(updated_at) = CURRENT_DATE;
  
  -- Get total restaurants with chat sessions
  SELECT COUNT(DISTINCT restaurant_id) INTO total_restaurants FROM chat_sessions;
  
  -- Get active support agents (simplified)
  SELECT COUNT(*) INTO agents_online FROM support_agents WHERE is_active = true;
  
  -- Build result
  result := json_build_object(
    'totalSessions', total_sessions,
    'activeSessions', active_sessions,
    'resolvedToday', resolved_today,
    'averageResponseTime', 0, -- Placeholder
    'totalRestaurants', total_restaurants,
    'agentsOnline', agents_online
  );
  
  RETURN result;
END;
$$;

-- Function to get recent subscriptions for super admin
CREATE OR REPLACE FUNCTION get_recent_subscriptions(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  plan_type subscription_plan_type,
  status subscription_status,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_email TEXT,
  restaurant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.plan_type,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.created_at,
    s.updated_at,
    COALESCE(u.email, 'Unknown') as user_email,
    COALESCE(r.name, 'Unknown Restaurant') as restaurant_name
  FROM subscriptions s
  LEFT JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN restaurants r ON r.owner_id = s.user_id
  ORDER BY s.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function to get subscription statistics
CREATE OR REPLACE FUNCTION get_subscription_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_count INTEGER;
  active_count INTEGER;
  trial_count INTEGER;
  paid_count INTEGER;
  total_revenue NUMERIC;
  churn_rate NUMERIC;
BEGIN
  -- Get total subscriptions
  SELECT COUNT(*) INTO total_count FROM subscriptions;
  
  -- Get active subscriptions
  SELECT COUNT(*) INTO active_count FROM subscriptions WHERE status = 'active';
  
  -- Get trial subscriptions
  SELECT COUNT(*) INTO trial_count FROM subscriptions WHERE plan_type = 'trial';
  
  -- Get paid subscriptions
  SELECT COUNT(*) INTO paid_count FROM subscriptions WHERE plan_type != 'trial';
  
  -- Calculate estimated monthly revenue (simplified)
  SELECT 
    COALESCE(
      SUM(CASE 
        WHEN plan_type = 'monthly' THEN 2.99
        WHEN plan_type = 'semiannual' THEN 9.99 / 6
        WHEN plan_type = 'annual' THEN 19.99 / 12
        ELSE 0
      END), 0
    ) INTO total_revenue
  FROM subscriptions 
  WHERE status = 'active' AND plan_type != 'trial';
  
  -- Calculate churn rate (simplified)
  churn_rate := 0; -- Placeholder
  
  -- Build result
  result := json_build_object(
    'total', total_count,
    'active', active_count,
    'trial', trial_count,
    'paid', paid_count,
    'totalRevenue', total_revenue,
    'churnRate', churn_rate
  );
  
  RETURN result;
END;
$$;

-- Function to get system-wide statistics
CREATE OR REPLACE FUNCTION get_system_wide_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_revenue NUMERIC;
  total_customers INTEGER;
  total_restaurants INTEGER;
  total_transactions INTEGER;
BEGIN
  -- Get total revenue from all customers
  SELECT COALESCE(SUM(total_spent), 0) INTO total_revenue FROM customers;
  
  -- Get total customers
  SELECT COUNT(*) INTO total_customers FROM customers;
  
  -- Get total restaurants
  SELECT COUNT(*) INTO total_restaurants FROM restaurants;
  
  -- Get total transactions
  SELECT COUNT(*) INTO total_transactions FROM transactions;
  
  -- Build result
  result := json_build_object(
    'totalRevenue', total_revenue,
    'totalCustomers', total_customers,
    'totalRestaurants', total_restaurants,
    'totalTransactions', total_transactions
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION authenticate_support_agent(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_support_agent(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_support_agent_context(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_subscriptions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_wide_stats() TO authenticated;

-- Grant service role permissions for webhook functions
GRANT EXECUTE ON FUNCTION authenticate_support_agent(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_support_agent(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION set_support_agent_context(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_chat_statistics() TO service_role;
GRANT EXECUTE ON FUNCTION get_recent_subscriptions(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_subscription_statistics() TO service_role;
GRANT EXECUTE ON FUNCTION get_system_wide_stats() TO service_role;