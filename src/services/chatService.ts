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

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
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
  // Set support agent context for database access
  static async setSupportAgentContext(agentEmail: string): Promise<void> {
    try {
      console.log('🔐 Setting support agent context:', agentEmail);
      const { data, error } = await supabase.rpc('set_support_agent_context', {
        agent_email: agentEmail
      });
      
      if (error) {
        console.error('❌ Error setting agent context:', error);
        throw error;
      }
      
      console.log('✅ Support agent context set successfully:', data);
      
      // Test the context
      const { data: testData } = await supabase.rpc('test_support_agent_context');
      console.log('🧪 Context test result:', testData);
      
    } catch (error: any) {
      console.error('Error setting support agent context:', error);
      throw error;
    }
  }

  // Get all chat sessions (for support agents - sees ALL restaurants)
  static async getAllChatSessions(): Promise<ChatSession[]> {
    try {
      console.log('🔍 Fetching ALL chat sessions for support portal');
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all chat sessions:', error);
        throw error;
      }
      
      console.log('✅ Fetched all chat sessions:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching all chat sessions:', error);
      return [];
    }
  }

  // Get chat sessions for a specific restaurant (for restaurant managers)
  static async getRestaurantChatSessions(restaurantId: string): Promise<ChatSession[]> {
    try {
      console.log('🔍 Fetching chat sessions for restaurant:', restaurantId);
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .eq('restaurant_id', restaurantId)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching restaurant chat sessions:', error);
        throw error;
      }
      
      console.log('✅ Fetched restaurant chat sessions:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching restaurant chat sessions:', error);
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

  // Send a message with proper real-time handling
  static async sendMessage(messageData: CreateMessageData): Promise<ChatMessage> {
    console.log('📤 Sending message:', {
      sessionId: messageData.session_id,
      senderType: messageData.sender_type,
      senderName: messageData.sender_name,
      messageLength: messageData.message.length,
      isSystem: messageData.is_system_message
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

  // Add participant to session with proper validation
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

    // Validate user_type before inserting
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

  // Real-time subscriptions with enhanced error handling
  static subscribeToAllSessions(callback: (payload: any) => void) {
    console.log('🔌 Setting up global sessions subscription');
    
    const channel = supabase
      .channel('all_chat_sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_sessions' }, 
        (payload) => {
          console.log('🔄 [REALTIME] Sessions payload received:', {
            eventType: payload.eventType,
            sessionId: payload.new?.id,
            restaurantId: payload.new?.restaurant_id,
            title: payload.new?.title,
            status: payload.new?.status,
            timestamp: new Date().toISOString()
          });
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 [REALTIME] Global sessions subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Global sessions subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Global sessions subscription error');
        }
      });

    return channel;
  }

  static subscribeToMessages(sessionId: string, callback: (payload: any) => void) {
    console.log('🔌 [REALTIME] Setting up messages subscription for session:', sessionId);
    
    const channel = supabase
      .channel(`chat_messages_${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('📨 [REALTIME] Message payload received:', {
            eventType: payload.eventType,
            messageId: payload.new?.id,
            senderId: payload.new?.sender_id,
            senderType: payload.new?.sender_type,
            sessionId: payload.new?.session_id,
            timestamp: new Date().toISOString(),
            messagePreview: payload.new?.message?.substring(0, 50) + '...'
          });
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 [REALTIME] Messages subscription status for session', sessionId, ':', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Messages subscription active for session:', sessionId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Messages subscription error for session:', sessionId);
        }
      });

    return channel;
  }

  static subscribeToParticipants(sessionId: string, callback: (payload: any) => void) {
    console.log('🔌 [REALTIME] Setting up participants subscription for session:', sessionId);
    
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
          console.log('👥 [REALTIME] Participants payload received:', {
            eventType: payload.eventType,
            participantId: payload.new?.id,
            userType: payload.new?.user_type,
            userName: payload.new?.user_name,
            isOnline: payload.new?.is_online
          });
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 [REALTIME] Participants subscription status for session', sessionId, ':', status);
      });

    return channel;
  }

  // Get chat statistics
  static async getChatStats(): Promise<any> {
    try {
      console.log('📊 Fetching comprehensive chat statistics');
      
      const { data, error } = await supabase.rpc('get_chat_statistics');

      if (error) throw error;

      console.log('✅ Chat statistics loaded:', data);
      return data || {
        totalSessions: 0,
        activeSessions: 0,
        resolvedToday: 0,
        averageResponseTime: 0,
        totalRestaurants: 0,
        agentsOnline: 0
      };
    } catch (error: any) {
      console.error('Error fetching chat stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        resolvedToday: 0,
        averageResponseTime: 0,
        totalRestaurants: 0,
        agentsOnline: 0
      };
    }
  }

  // Authenticate support agent
  static async authenticateSupportAgent(email: string, password: string): Promise<{
    success: boolean;
    agent?: any;
    error?: string;
  }> {
    try {
      console.log('🔐 Authenticating support agent:', email);
      
      // For demo purposes, accept any email/password combination
      // In production, you would validate against the support_agents table
      const agent = {
        id: `agent_${Date.now()}`,
        name: email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email: email,
        role: 'agent',
        is_active: true,
        last_login_at: new Date().toISOString()
      };

      // Set the agent context for this session
      await this.setSupportAgentContext(email);

      console.log('✅ Support agent authenticated:', agent.name);
      return { success: true, agent };
    } catch (error: any) {
      console.error('❌ Error authenticating support agent:', error);
      return { success: false, error: error.message };
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