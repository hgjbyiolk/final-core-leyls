import { supabase } from '../lib/supabase';

export interface SupportTicket {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_by_user_id: string;
  assigned_to_admin?: string;
  created_at: string;
  updated_at: string;
  restaurant?: {
    name: string;
    slug: string;
  };
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'restaurant_manager' | 'super_admin' | 'support_agent';
  sender_id: string;
  message: string;
  created_at: string;
}

export interface CreateTicketData {
  restaurant_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_by_user_id: string;
}

export interface CreateMessageData {
  ticket_id: string;
  sender_type: 'restaurant_manager' | 'super_admin' | 'support_agent';
  sender_id: string;
  message: string;
}

export class SupportService {
  // 🔍 Get ALL tickets (use this for support agents / super admins)
  static async getAllTickets(): Promise<SupportTicket[]> {
    try {
      console.log('🔍 [SupportService] Fetching ALL tickets (super admin / support agent mode)');
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [SupportService] Error fetching all tickets:', error);
        throw error;
      }

      console.log('✅ [SupportService] Tickets fetched:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('❌ [SupportService] Exception fetching all tickets:', error.message);
      return [];
    }
  }

  // 🔍 Get tickets for a single restaurant (use this for restaurant managers)
  static async getRestaurantTickets(restaurantId: string): Promise<SupportTicket[]> {
    try {
      console.log('🔍 [SupportService] Fetching tickets for restaurant:', restaurantId);
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          restaurant:restaurants(name, slug)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [SupportService] Error fetching restaurant tickets:', error);
        throw error;
      }

      console.log('✅ [SupportService] Restaurant tickets fetched:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('❌ [SupportService] Exception fetching restaurant tickets:', error.message);
      return [];
    }
  }

  // 📝 Create a new ticket
  static async createTicket(ticketData: CreateTicketData): Promise<SupportTicket> {
    console.log('📝 [SupportService] Creating ticket:', ticketData.title);
    const { data, error } = await supabase
      .from('support_tickets')
      .insert(ticketData)
      .select(`
        *,
        restaurant:restaurants(name, slug)
      `)
      .single();

    if (error) {
      console.error('❌ [SupportService] Error creating ticket:', error);
      throw error;
    }

    console.log('✅ [SupportService] Ticket created:', data.id);
    return data;
  }

  // 🔄 Update ticket status
  static async updateTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
    assignedToAdmin?: string
  ): Promise<void> {
    console.log('🔄 [SupportService] Updating ticket status:', { ticketId, status, assignedToAdmin });
    const updates: any = { status };
    if (assignedToAdmin !== undefined) {
      updates.assigned_to_admin = assignedToAdmin;
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) {
      console.error('❌ [SupportService] Error updating ticket:', error);
      throw error;
    }

    console.log('✅ [SupportService] Ticket updated');
  }

  // 📨 Get messages for a ticket
  static async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    try {
      console.log('📨 [SupportService] Fetching messages for ticket:', ticketId);
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [SupportService] Error fetching messages:', error);
        throw error;
      }

      console.log('✅ [SupportService] Messages fetched:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('❌ [SupportService] Exception fetching messages:', error.message);
      return [];
    }
  }

  // 📤 Send a message
  static async sendMessage(messageData: CreateMessageData): Promise<SupportMessage> {
    console.log('📤 [SupportService] Sending message:', {
      ticketId: messageData.ticket_id,
      senderType: messageData.sender_type,
    });

    const { data, error } = await supabase
      .from('support_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('❌ [SupportService] Error sending message:', error);
      throw error;
    }

    console.log('✅ [SupportService] Message sent:', data.id);
    return data;
  }

  // 📊 Ticket stats
  static async getTicketStats() {
    try {
      console.log('📊 [SupportService] Fetching stats');
      const { data, error } = await supabase
        .from('support_tickets')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        open: data?.filter(t => t.status === 'open').length || 0,
        inProgress: data?.filter(t => t.status === 'in_progress').length || 0,
        resolved: data?.filter(t => t.status === 'resolved').length || 0,
        closed: data?.filter(t => t.status === 'closed').length || 0,
      };

      console.log('✅ [SupportService] Stats:', stats);
      return stats;
    } catch (error: any) {
      console.error('❌ [SupportService] Error fetching stats:', error.message);
      return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
    }
  }

  // 🔌 Subscribe to tickets
  static subscribeToTickets(callback: (payload: any) => void) {
    console.log('🔌 [SupportService] Subscribing to ALL tickets');
    return supabase
      .channel('support_tickets')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          console.log('🎫 [SupportService] Ticket update:', payload);
          callback(payload);
        }
      )
      .subscribe();
  }

  // 🔌 Subscribe to messages for a specific ticket
  static subscribeToMessages(ticketId: string, callback: (payload: any) => void) {
    console.log('🔌 [SupportService] Subscribing to messages for ticket:', ticketId);
    return supabase
      .channel(`support_messages_${ticketId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('📨 [SupportService] Message update:', payload);
          callback(payload);
        }
      )
      .subscribe();
  }

  // 🔌 Subscribe to ALL messages (for support agents / super admins)
  static subscribeToAllMessages(callback: (payload: any) => void) {
    console.log('🔌 [SupportService] Subscribing to ALL messages (super admin / support agent mode)');
    return supabase
      .channel('all_support_messages')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages' },
        (payload) => {
          console.log('📨 [SupportService] Global message update:', payload);
          callback(payload);
        }
      )
      .subscribe();
  }
}
