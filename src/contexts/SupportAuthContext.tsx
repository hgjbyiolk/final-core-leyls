import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ChatService, SupportAgent } from '../services/chatService';

interface SupportAuthContextType {
  agent: SupportAgent | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const SupportAuthContext = createContext<SupportAuthContextType | undefined>(undefined);

export const useSupportAuth = () => {
  const context = useContext(SupportAuthContext);
  if (context === undefined) {
    throw new Error('useSupportAuth must be used within a SupportAuthProvider');
  }
  return context;
};

export const SupportAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agent, setAgent] = useState<SupportAgent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const agentData = localStorage.getItem('support_agent_data');
        const loginTime = localStorage.getItem('support_agent_login_time');

        if (agentData && loginTime) {
          const loginDate = new Date(loginTime);
          const now = new Date();
          const hoursSinceLogin =
            (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);

          if (hoursSinceLogin < 24) {
            const parsedAgent: SupportAgent = JSON.parse(agentData);
            setAgent(parsedAgent);
            console.log('🔐 [SUPPORT AUTH] Restored agent session:', parsedAgent.name);

            // Set DB context so RLS recognizes this agent
            await ChatService.setSupportAgentContext(parsedAgent.email);
          } else {
            localStorage.removeItem('support_agent_data');
            localStorage.removeItem('support_agent_login_time');
            console.log('⏰ [SUPPORT AUTH] Session expired, cleared storage');
          }
        }
      } catch (error) {
        console.error('❌ [SUPPORT AUTH] Error checking existing session:', error);
        localStorage.removeItem('support_agent_data');
        localStorage.removeItem('support_agent_login_time');
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, []);

const signIn = async (email: string, password: string) => {
  try {
    console.log('🔐 [SUPPORT AUTH] Attempting sign in:', email);

    // Call RPC (returns { id, name, email })
    const { data, error } = await supabase.rpc('authenticate_support_agent', {
      agent_email: email,
      agent_password: password,
    });

    if (error) {
      console.error('❌ [SUPPORT AUTH] RPC error:', error);
      return { error: 'Authentication failed' };
    }

    // Supabase RPC returns an array of rows → pick first
    const agent = data?.[0];

    if (!agent) {
      console.log('❌ [SUPPORT AUTH] Invalid credentials for:', email);
      return { error: 'Invalid credentials or inactive account' };
    }

    console.log('✅ [SUPPORT AUTH] Agent authenticated:', {
      id: agent.id,
      name: agent.name,
      email: agent.email,
    });

    // Save locally
    setAgent(agent);
    localStorage.setItem('support_agent_data', JSON.stringify(agent));
    localStorage.setItem('support_agent_login_time', new Date().toISOString());

    // Set DB context for RLS
    await ChatService.setSupportAgentContext(agent.email);

    return { error: null };
  } catch (err: any) {
    console.error('❌ [SUPPORT AUTH] Sign in error:', err);
    return { error: err.message || 'Authentication failed' };
  }
};

  const signOut = () => {
    console.log('🔐 [SUPPORT AUTH] Signing out agent:', agent?.name);
    setAgent(null);
    localStorage.removeItem('support_agent_data');
    localStorage.removeItem('support_agent_login_time');
  };

  const value = {
    agent,
    loading,
    signIn,
    signOut,
  };

  return (
    <SupportAuthContext.Provider value={value}>
      {children}
    </SupportAuthContext.Provider>
  );
};
