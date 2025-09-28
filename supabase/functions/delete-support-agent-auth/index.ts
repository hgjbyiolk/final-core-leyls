import { createClient } from "npm:@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteAgentRequest {
  agentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { agentId }: DeleteAgentRequest = await req.json();

    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    console.log('🗑️ Deleting support agent:', agentId);

    // First, get the agent to verify it exists and is a support agent
    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('email, role')
      .eq('id', agentId)
      .eq('role', 'support')
      .single();

    if (fetchError || !agent) {
      throw new Error('Support agent not found');
    }

    console.log('👤 Found support agent to delete:', agent.email);

    // Delete from support_agents table first
    const { error: agentsError } = await supabaseAdmin
      .from('support_agents')
      .delete()
      .eq('id', agentId);

    if (agentsError) {
      console.error('❌ Error deleting from support_agents table:', agentsError);
      throw new Error(`Failed to delete support agent record: ${agentsError.message}`);
    }

    console.log('✅ Deleted from support_agents table');

    // Delete from users table
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', agentId)
      .eq('role', 'support');

    if (usersError) {
      console.error('❌ Error deleting from users table:', usersError);
      throw new Error(`Failed to delete user record: ${usersError.message}`);
    }

    console.log('✅ Deleted from users table');

    // Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(agentId);

    if (authError) {
      console.error('❌ Error deleting auth user:', authError);
      throw new Error(`Failed to delete auth user: ${authError.message}`);
    }

    console.log('✅ Support agent deleted successfully from all tables and auth');

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error deleting support agent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});