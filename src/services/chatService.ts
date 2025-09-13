import { supabase } from '../lib/supabase';

export interface ChatSession {
  id: string;
  restaurant_id: string;
  title: string;
  status: 'active' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_by_user_id: string;
  assigned_agent_name?: string;
  assigned_agent_id?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  restaurant?: {
    name: string;
    slug: string;
  };
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: 'restaurant_manager' | 'support_agent';
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'file';
  has_attachments: boolean;
  is_system_message: boolean;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  session_id: string;
  user_type: 'restaurant_manager' | 'support_agent';
  user_id: string;
  user_name: string;
  joined_at: string;
  last_seen_at: string;
  is_online: boolean;
}

export interface CreateSessionData {
  restaurant_id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_by_user_id: string;
}

export interface CreateMessageData {
  session_id: string;
  sender_type: 'restaurant_manager' | 'support_agent';
  sender_id: string;
  sender_name: string;
  message: string;
  message_type?: 'text' | 'image' | 'file';
  has_attachments?: boolean;
  is_system_message?: boolean;
}

export interface CreateParticipantData {
  user_type: 'restaurant_manager' | 'support_agent';
  user_id: string;
  user_name: string;
}

export class ChatService {
  // Check if current user is a support agent
  static async isSupportAgent(): Promise<boolean> {
    try {
      const agentData = localStorage.getItem('support_agent_data');
      return !!agentData;
    } catch (error) {
      return false;
    }
  }

  // Get current support agent data
  static getSupportAgentData(): any {
    try {
      const agentData = localStorage.getItem('support_agent_data');
      return agentData ? JSON.parse(agentData) : null;
    } catch (error) {
      return null;
    }
  }

  // Get chat sessions - FIXED to show all restaurants for support agents
  static async getChatSessions(restaurantId?: string): Promise<ChatSession[]> {
    try {
      const isSupportAgent = await this.isSupportAgent();
      
      console.log('🔍 Fetching chat sessions:', {
        isSupportAgent,
        restaurantId,
        willFilterByRestaurant: !isSupportAgent && !!restaurantId
      });

      let query = supabase
        .from('chat_sessions')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .order('last_message_at', { ascending: false });

      // Only filter by restaurant if user is NOT a support agent
      if (!isSupportAgent && restaurantId) {
        console.log('👤 Restaurant manager - filtering by restaurant:', restaurantId);
        query = query.eq('restaurant_id', restaurantId);
      } else if (isSupportAgent) {
        console.log('🎧 Support agent - showing ALL restaurants');
        // Support agents see ALL sessions from ALL restaurants
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching chat sessions:', error);
        throw error;
      }
      
      console.log('✅ Fetched chat sessions:', {
        count: data?.length || 0,
        isSupportAgent,
        restaurants: isSupportAgent ? [...new Set(data?.map(s => s.restaurant?.name))].length : 'filtered'
      });
      
      return data || [];
    } catch (error: any) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  }

  // Create a new chat session
  static async createChatSession(sessionData: CreateSessionData): Promise<ChatSession> {
    console.log('📝 Creating new chat session:', sessionData.title);
    
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert(sessionData)
      .select(`
        *,
        restaurant:restaurants(name, slug)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating chat session:', error);
      throw error;
    }
    
    console.log('✅ Chat session created successfully:', data.id);
    return data;
  }

  // Update chat session
  static async updateChatSession(
    sessionId: string,
    updates: Partial<ChatSession>
  ): Promise<ChatSession | null> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .single();

      if (error) {
        console.error('❌ Error updating chat session:', error);
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error('Error updating chat session:', error);
      return null;
    }
  }

  // Assign agent to session
  static async assignAgentToSession(
    sessionId: string,
    agentName: string,
    agentId: string
  ): Promise<void> {
    console.log('👤 Assigning agent to session:', { sessionId, agentName, agentId });
    
    const { error } = await supabase
      .from('chat_sessions')
      .update({
        assigned_agent_name: agentName,
        assigned_agent_id: agentId,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('❌ Error assigning agent:', error);
      throw error;
    }
    
    console.log('✅ Agent assigned successfully');
  }

  // Get messages for a chat session
  static async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      console.log('📨 Fetching messages for session:', sessionId);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching messages:', error);
        throw error;
      }
      
      console.log('✅ Fetched messages:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  }

  // Send a message - FIXED for real-time delivery
  static async sendMessage(messageData: CreateMessageData): Promise<ChatMessage> {
    console.log('📤 Sending message:', {
      sessionId: messageData.session_id,
      senderType: messageData.sender_type,
      senderName: messageData.sender_name,
      messageLength: messageData.message.length
    });
    
    // Ensure proper message data structure
    const messageToInsert = {
      session_id: messageData.session_id,
      sender_type: messageData.sender_type,
      sender_id: messageData.sender_id,
      sender_name: messageData.sender_name,
      message: messageData.message,
      message_type: messageData.message_type || 'text',
      has_attachments: messageData.has_attachments || false,
      is_system_message: messageData.is_system_message || false
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(messageToInsert)
      .select()
      .single();

    if (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
    
    console.log('✅ Message sent successfully:', data.id);
    return data;
  }

  // Get participants for a chat session
  static async getChatParticipants(sessionId: string): Promise<ChatParticipant[]> {
    try {
      console.log('👥 Fetching participants for session:', sessionId);
      
      const { data, error } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching participants:', error);
        throw error;
      }
      
      console.log('✅ Fetched participants:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching chat participants:', error);
      return [];
    }
  }

  // Add participant to session - FIXED constraint violation
  static async addParticipant(
    sessionId: string,
    participantData: CreateParticipantData
  ): Promise<ChatParticipant> {
    console.log('👤 Adding participant to session:', {
      sessionId,
      userType: participantData.user_type,
      userName: participantData.user_name,
      userId: participantData.user_id
    });

    // Validate user_type before inserting - FIXED
    if (!['restaurant_manager', 'support_agent'].includes(participantData.user_type)) {
      throw new Error(`Invalid user_type: ${participantData.user_type}. Must be 'restaurant_manager' or 'support_agent'`);
    }
    
    const participantToInsert = {
      session_id: sessionId,
      user_type: participantData.user_type,
      user_id: participantData.user_id,
      user_name: participantData.user_name
    };

    const { data, error } = await supabase
      .from('chat_participants')
      .insert(participantToInsert)
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding participant:', error);
      throw error;
    }
    
    console.log('✅ Participant added successfully:', data.id);
    return data;
  }

  // Update participant status
  static async updateParticipantStatus(
    sessionId: string,
    userId: string,
    isOnline: boolean
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({
          is_online: isOnline,
          last_seen_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating participant status:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Error updating participant status:', error);
    }
  }

  // FIXED: Real-time subscriptions for sessions (all restaurants for support agents)
  static subscribeToAllSessions(callback: (payload: any) => void, isSupportAgent: boolean = false) {
    console.log('🔌 Setting up sessions subscription:', { isSupportAgent });
    
    const channel = supabase
      .channel('all_chat_sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_sessions' }, 
        (payload) => {
          console.log('🔄 Sessions subscription update:', {
            eventType: payload.eventType,
            sessionId: payload.new?.id,
            restaurantId: payload.new?.restaurant_id,
            isSupportAgent
          });
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Sessions subscription status:', status);
      });

    return channel;
  }

  // FIXED: Real-time subscriptions for messages with proper filtering
  static subscribeToMessages(sessionId: string, callback: (payload: any) => void) {
    console.log('🔌 Setting up messages subscription for session:', sessionId);
    
    const channel = supabase
      .channel(`chat_messages_${sessionId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('📨 NEW MESSAGE received via subscription:', {
            messageId: payload.new?.id,
            sessionId: payload.new?.session_id,
            senderType: payload.new?.sender_type,
            senderName: payload.new?.sender_name,
            message: payload.new?.message?.substring(0, 50) + '...'
          });
          callback(payload);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📨 MESSAGE UPDATED via subscription:', payload.new?.id);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages subscription status:', status);
      });

    return channel;
  }

  // FIXED: Real-time subscriptions for participants
  static subscribeToParticipants(sessionId: string, callback: (payload: any) => void) {
    console.log('🔌 Setting up participants subscription for session:', sessionId);
    
    const channel = supabase
      .channel(`chat_participants_${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_participants',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('👥 Participants subscription update:', payload.eventType, payload.new?.id);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Participants subscription status:', status);
      });

    return channel;
  }

  // Get chat statistics
  static async getChatStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    resolvedToday: number;
    averageResponseTime: number;
  }> {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('status, created_at');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalSessions = sessions?.length || 0;
      const activeSessions = sessions?.filter(s => s.status === 'active').length || 0;
      const resolvedToday = sessions?.filter(s => 
        s.status === 'resolved' && new Date(s.created_at) >= today
      ).length || 0;

      return {
        totalSessions,
        activeSessions,
        resolvedToday,
        averageResponseTime: 0 // Would calculate from message timestamps
      };
    } catch (error: any) {
      console.error('Error fetching chat stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        resolvedToday: 0,
        averageResponseTime: 0
      };
    }
  }

  // Authenticate support agent - ENHANCED
  static async authenticateSupportAgent(email: string, password: string, name: string): Promise<{
    success: boolean;
    agent?: any;
    error?: string;
  }> {
    try {
      console.log('🔐 Authenticating support agent:', { email, name });
      
      // For demo purposes, accept any email/password/name combination
      // In production, you would validate against the support_agents table
      if (!email || !password || !name) {
        return { success: false, error: 'All fields are required' };
      }

      const agent = {
        id: `agent_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        role: 'support_agent',
        is_active: true,
        last_login_at: new Date().toISOString()
      };

      // Store agent data in localStorage for session management
      localStorage.setItem('support_agent_data', JSON.stringify(agent));
      localStorage.setItem('support_agent_login_time', new Date().toISOString());

      console.log('✅ Support agent authenticated:', agent.name);
      return { success: true, agent };
    } catch (error: any) {
      console.error('❌ Error authenticating support agent:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out support agent
  static signOutSupportAgent(): void {
    localStorage.removeItem('support_agent_data');
    localStorage.removeItem('support_agent_login_time');
    console.log('👋 Support agent signed out');
  }

  // Check if support agent session is valid
  static isSupportAgentSessionValid(): boolean {
    try {
      const agentData = localStorage.getItem('support_agent_data');
      const loginTime = localStorage.getItem('support_agent_login_time');
      
      if (!agentData || !loginTime) {
        return false;
      }

      // Check if session is still valid (24 hours)
      const loginDate = new Date(loginTime);
      const now = new Date();
      const hoursSinceLogin = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
      
      return hoursSinceLogin <= 24;
    } catch (error) {
      return false;
    }
  }

  // Clean up subscriptions properly
  static cleanupSubscription(subscription: any): void {
    if (subscription && typeof subscription.unsubscribe === 'function') {
      try {
        subscription.unsubscribe();
        console.log('🧹 Subscription cleaned up successfully');
      } catch (error) {
        console.warn('⚠️ Error cleaning up subscription:', error);
      }
    }
  }
}