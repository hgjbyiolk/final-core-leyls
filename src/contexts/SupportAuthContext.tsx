import React, { createContext, useContext, useEffect, useState } from 'react';
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
    // Check if support agent is already logged in
    const checkExistingSession = () => {
      try {
        const agentData = localStorage.getItem('support_agent_data');
        const loginTime = localStorage.getItem('support_agent_login_time');
        
        if (agentData && loginTime) {
          const loginDate = new Date(loginTime);
          const now = new Date();
          const hoursSinceLogin = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
          
          // Session valid for 24 hours
          if (hoursSinceLogin < 24) {
            const parsedAgent = JSON.parse(agentData);
            setAgent(parsedAgent);
            console.log('🔐 [SUPPORT AUTH] Restored agent session:', parsedAgent.name);
            
            // Set support agent context
            ChatService.setSupportAgentContext(parsedAgent.email).catch(console.error);
          } else {
            // Session expired
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
      
      const result = await ChatService.authenticateSupportAgent(email, password);
      
      if (result.success && result.agent) {
        setAgent(result.agent);
        
        // Store session
        localStorage.setItem('support_agent_data', JSON.stringify(result.agent));
        localStorage.setItem('support_agent_login_time', new Date().toISOString());
        
        // Set support agent context
        await ChatService.setSupportAgentContext(result.agent.email);
        
        console.log('✅ [SUPPORT AUTH] Sign in successful:', result.agent.name);
        return { error: null };
      } else {
        console.error('❌ [SUPPORT AUTH] Sign in failed:', result.error);
        return { error: result.error || 'Authentication failed' };
      }
    } catch (error: any) {
      console.error('❌ [SUPPORT AUTH] Sign in error:', error);
      return { error: error.message || 'Authentication failed' };
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