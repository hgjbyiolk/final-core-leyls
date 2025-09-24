
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

  // Restore session from localStorage
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

            if (parsedAgent?.email) {
              setAgent(parsedAgent);
              console.log('🔐 [SUPPORT AUTH] Restored agent session:', parsedAgent.email);

              // Restore DB context
              await ChatService.setSupportAgentContext(parsedAgent.email);
            } else {
              console.warn('⚠️ [SUPPORT AUTH] Stored agent data invalid, clearing...');
              localStorage.removeItem('support_agent_data');
              localStorage.removeItem('support_agent_login_time');
            }
          } else {
            console.log('⏰ [SUPPORT AUTH] Session expired, clearing...');
            localStorage.removeItem('support_agent_data');
            localStorage.removeItem('support_agent_login_time');
          }
        }
      } catch (error) {
        console.error('❌ [SUPPORT AUTH] Error restoring session:', error);
        localStorage.removeItem('support_agent_data');
        localStorage.removeItem('support_agent_login_time');
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 [SUPPORT AUTH] Starting authentication for:', email);

      // Call the authentication function
      const { data: authData, error: authError } = await supabase.rpc('authenticate_support_agent', {
        agent_email: email,
        agent_password: password
      });

      if (authError) {
        console.error('❌ [SUPPORT AUTH] Authentication RPC error:', authError);
        return { error: 'Authentication failed' };
      }

      console.log('🔐 [SUPPORT AUTH] Authentication response:', authData);

      // Check if authentication was successful
      if (!authData) {
        console.log('❌ [SUPPORT AUTH] Authentication failed for:', email);
        return { error: 'Invalid credentials or inactive account' };
      }

      // The RPC now returns a single agent record, not an array
      const authenticatedAgent: SupportAgent = authData;
      
      console.log('✅ [SUPPORT AUTH] Agent authenticated:', {
        id: authenticatedAgent.id,
        name: authenticatedAgent.name,
        email: authenticatedAgent.email
      });

      setAgent(authenticatedAgent);
      localStorage.setItem('support_agent_data', JSON.stringify(authenticatedAgent));
      localStorage.setItem('support_agent_login_time', new Date().toISOString());

      // Set database context for RLS
      await ChatService.setSupportAgentContext(authenticatedAgent.email);

      return { error: null };
    } catch (err: any) {
      console.error('❌ [SUPPORT AUTH] Sign in error:', err);
      return { error: err.message || 'Authentication failed' };
    }
  };

  const signOut = () => {
    console.log('🔐 [SUPPORT AUTH] Signing out agent:', agent?.email);
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
