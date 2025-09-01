import { supabase } from '../lib/supabase';

export interface ChatSession {
  id: string;
  restaurant_id: string;
  title: string;
  status: 'active' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_by_user_id: string;
  assigned_admin_name?: string;
  assigned_admin_id?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  restaurant?: {
    name: string;
    slug: string;
  };
  unread_count?: number;
  last_message?: {
    message: string;
    sender_name: string;
    sender_type: string;
  };
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: 'restaurant_manager' | 'super_admin';
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'file';
  has_attachments: boolean;
  is_system_message: boolean;
  created_at: string;
  attachments?: MessageAttachment[];
}

export interface ChatParticipant {
  id: string;
  session_id: string;
  user_type: 'restaurant_manager' | 'super_admin';
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

export interface CreateChatSessionData {
  restaurant_id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_by_user_id: string;
}

export interface SendMessageData {
  session_id: string;
  sender_type: 'restaurant_manager' | 'super_admin';
  sender_id: string;
  sender_name: string;
  message: string;
  message_type?: 'text' | 'image' | 'file';
  attachments?: File[];
}

export class ChatService {
  // Get all chat sessions (for super admin)
  static async getAllChatSessions(): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get unread counts and last messages for each session
      const sessionsWithMetadata = await Promise.all(
        (data || []).map(async (session) => {
          const [unreadCount, lastMessage] = await Promise.all([
            this.getUnreadCount(session.id, 'super_admin'),
            this.getLastMessage(session.id)
          ]);

          return {
            ...session,
            unread_count: unreadCount,
            last_message: lastMessage
          };
        })
      );

      return sessionsWithMetadata;
    } catch (error: any) {
      console.error('Error fetching all chat sessions:', error);
      return [];
    }
  }

  // Get chat sessions for a specific restaurant
  static async getRestaurantChatSessions(restaurantId: string): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get unread counts and last messages for each session
      const sessionsWithMetadata = await Promise.all(
        (data || []).map(async (session) => {
          const [unreadCount, lastMessage] = await Promise.all([
            this.getUnreadCount(session.id, 'restaurant_manager'),
            this.getLastMessage(session.id)
          ]);

          return {
            ...session,
            unread_count: unreadCount,
            last_message: lastMessage
          };
        })
      );

      return sessionsWithMetadata;
    } catch (error: any) {
      console.error('Error fetching restaurant chat sessions:', error);
      return [];
    }
  }

  // Create a new chat session
  static async createChatSession(sessionData: CreateChatSessionData): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;

    // Add the creator as a participant
    await this.addParticipant(data.id, {
      user_type: 'restaurant_manager',
      user_id: sessionData.created_by_user_id,
      user_name: 'Restaurant Manager' // This will be updated with actual name
    });

    return data;
  }

  // Update chat session
  static async updateChatSession(
    sessionId: string,
    updates: Partial<Pick<ChatSession, 'title' | 'status' | 'priority' | 'assigned_admin_name' | 'assigned_admin_id'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
  }

  // Get messages for a chat session
  static async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          attachments:message_attachments(*)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  }

  // Send a message
  static async sendMessage(messageData: SendMessageData): Promise<ChatMessage> {
    try {
      // Insert the message
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: messageData.session_id,
          sender_type: messageData.sender_type,
          sender_id: messageData.sender_id,
          sender_name: messageData.sender_name,
          message: messageData.message,
          message_type: messageData.message_type || 'text',
          has_attachments: (messageData.attachments?.length || 0) > 0
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Handle file attachments if any
      if (messageData.attachments && messageData.attachments.length > 0) {
        await this.uploadAttachments(message.id, messageData.attachments);
      }

      return message;
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Upload attachments for a message
  static async uploadAttachments(messageId: string, files: File[]): Promise<MessageAttachment[]> {
    const attachments: MessageAttachment[] = [];

    for (const file of files) {
      try {
        // Generate unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `chat-attachments/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);

        // Create attachment record
        const { data: attachment, error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: urlData.publicUrl
          })
          .select()
          .single();

        if (attachmentError) {
          console.error('Error creating attachment record:', attachmentError);
          continue;
        }

        attachments.push(attachment);
      } catch (error) {
        console.error('Error processing file:', file.name, error);
      }
    }

    return attachments;
  }

  // Add participant to chat session
  static async addParticipant(
    sessionId: string,
    participant: {
      user_type: 'restaurant_manager' | 'super_admin';
      user_id: string;
      user_name: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_participants')
      .upsert({
        session_id: sessionId,
        user_type: participant.user_type,
        user_id: participant.user_id,
        user_name: participant.user_name,
        is_online: true,
        last_seen_at: new Date().toISOString()
      });

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      throw error;
    }
  }

  // Update participant online status
  static async updateParticipantStatus(
    sessionId: string,
    userId: string,
    isOnline: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_participants')
      .update({
        is_online: isOnline,
        last_seen_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating participant status:', error);
    }
  }

  // Get participants for a chat session
  static async getChatParticipants(sessionId: string): Promise<ChatParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching chat participants:', error);
      return [];
    }
  }

  // Get unread message count
  static async getUnreadCount(sessionId: string, userType: string): Promise<number> {
    try {
      // For simplicity, we'll count messages from the other user type
      const otherUserType = userType === 'restaurant_manager' ? 'super_admin' : 'restaurant_manager';
      
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('sender_type', otherUserType)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Get last message for a session
  static async getLastMessage(sessionId: string): Promise<{
    message: string;
    sender_name: string;
    sender_type: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('message, sender_name, sender_type')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting last message:', error);
      return null;
    }
  }

  // Subscribe to real-time updates for chat sessions
  static subscribeToChatSessions(callback: (payload: any) => void) {
    return supabase
      .channel('chat_sessions_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_sessions' }, 
        callback
      )
      .subscribe();
  }

  // Subscribe to real-time updates for messages in a specific session
  static subscribeToMessages(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat_messages_${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        }, 
        callback
      )
      .subscribe();
  }

  // Subscribe to participant updates
  static subscribeToParticipants(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat_participants_${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_participants',
          filter: `session_id=eq.${sessionId}`
        }, 
        callback
      )
      .subscribe();
  }

  // Join a chat session (for super admin)
  static async joinChatSession(
    sessionId: string,
    adminId: string,
    adminName: string
  ): Promise<void> {
    try {
      // Add admin as participant
      await this.addParticipant(sessionId, {
        user_type: 'super_admin',
        user_id: adminId,
        user_name: adminName
      });

      // Update session with assigned admin
      await this.updateChatSession(sessionId, {
        assigned_admin_id: adminId,
        assigned_admin_name: adminName
      });

      // Send system message
      await this.sendMessage({
        session_id: sessionId,
        sender_type: 'super_admin',
        sender_id: 'system',
        sender_name: 'System',
        message: `${adminName} joined the chat`,
        message_type: 'text'
      });

    } catch (error) {
      console.error('Error joining chat session:', error);
      throw error;
    }
  }

  // Leave a chat session
  static async leaveChatSession(sessionId: string, userId: string): Promise<void> {
    try {
      await this.updateParticipantStatus(sessionId, userId, false);
    } catch (error) {
      console.error('Error leaving chat session:', error);
      throw error;
    }
  }

  // Get chat statistics
  static async getChatStats(): Promise<{
    total: number;
    active: number;
    resolved: number;
    closed: number;
    averageResponseTime: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        active: data?.filter(s => s.status === 'active').length || 0,
        resolved: data?.filter(s => s.status === 'resolved').length || 0,
        closed: data?.filter(s => s.status === 'closed').length || 0,
        averageResponseTime: 0 // TODO: Calculate based on message timestamps
      };

      return stats;
    } catch (error: any) {
      console.error('Error fetching chat stats:', error);
      return { total: 0, active: 0, resolved: 0, closed: 0, averageResponseTime: 0 };
    }
  }

  // Search chat sessions
  static async searchChatSessions(query: string, restaurantId?: string): Promise<ChatSession[]> {
    try {
      let queryBuilder = supabase
        .from('chat_sessions')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .or(`title.ilike.%${query}%,category.ilike.%${query}%`);

      if (restaurantId) {
        queryBuilder = queryBuilder.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await queryBuilder
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error searching chat sessions:', error);
      return [];
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(sessionId: string, userId: string): Promise<void> {
    try {
      await this.updateParticipantStatus(sessionId, userId, true);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Get file upload URL
  static async getUploadUrl(fileName: string, fileType: string): Promise<string> {
    try {
      const fileExt = fileName.split('.').pop();
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `chat-attachments/${uniqueFileName}`;

      const { data, error } = await supabase.storage
        .from('chat-files')
        .createSignedUploadUrl(filePath);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw error;
    }
  }

  // Delete attachment
  static async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      // Get attachment details first
      const { data: attachment, error: fetchError } = await supabase
        .from('message_attachments')
        .select('file_url')
        .eq('id', attachmentId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL
      const url = new URL(attachment.file_url);
      const filePath = url.pathname.split('/').slice(-2).join('/'); // Get last two parts

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('chat-files')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }

      // Delete attachment record
      const { error: deleteError } = await supabase
        .from('message_attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }
}