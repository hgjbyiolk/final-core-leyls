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
  // Get all chat sessions (for support agents)
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

  // Get chat sessions for a specific restaurant
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

  // Send a message
  static async sendMessage(messageData: CreateMessageData): Promise<ChatMessage> {
    console.log('📤 Sending message:', {
      sessionId: messageData.session_id,
      senderType: messageData.sender_type,
      senderName: messageData.sender_name,
      messageLength: messageData.message.length,
      isSystem: messageData.is_system_message
    });
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        ...messageData,
        message_type: messageData.message_type || 'text',
        has_attachments: messageData.has_attachments || false,
        is_system_message: messageData.is_system_message || false
      })
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

  // Add participant to session
  static async addParticipant(
    sessionId: string,
    participantData: CreateParticipantData
  ): Promise<ChatParticipant> {
    console.log('👤 Adding participant to session:', {
      sessionId,
      userType: participantData.user_type,
      userName: participantData.user_name
    });
    
    const { data, error } = await supabase
      .from('chat_participants')
      .insert({
        session_id: sessionId,
        ...participantData
      })
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

  // Real-time subscriptions
  static subscribeToAllSessions(callback: (payload: any) => void) {
    console.log('🔌 Setting up global sessions subscription');
    
    return supabase
      .channel('all_chat_sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_sessions' }, 
        (payload) => {
          console.log('🔄 Sessions subscription update:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Sessions subscription status:', status);
      });
  }

  static subscribeToMessages(sessionId: string, callback: (payload: any) => void) {
    console.log('🔌 Setting up messages subscription for session:', sessionId);
    
    return supabase
      .channel(`chat_messages_${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('📨 Messages subscription update:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages subscription status:', status);
      });
  }

  static subscribeToParticipants(sessionId: string, callback: (payload: any) => void) {
    console.log('🔌 Setting up participants subscription for session:', sessionId);
    
    return supabase
      .channel(`chat_participants_${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_participants',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('👥 Participants subscription update:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Participants subscription status:', status);
      });
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
}