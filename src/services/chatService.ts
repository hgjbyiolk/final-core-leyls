// --- services/ChatService.ts ---

import { supabase } from "../supabaseClient";

const ChatService = {
  // ✅ Get all sessions (RLS decides scope: agents see all, managers see only theirs)
  async getChatSessions() {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching chat sessions:", error);
      return [];
    }
    return data;
  },

  // ✅ Get messages for a session
  async getMessages(sessionId: string) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Error fetching messages:", error);
      return [];
    }
    return data;
  },

  // ✅ Send a message
  async sendMessage(sessionId: string, senderType: string, senderId: string, senderName: string, message: string) {
    const { data, error } = await supabase.from("chat_messages").insert([
      {
        session_id: sessionId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message,
      },
    ]);

    if (error) {
      console.error("❌ Error sending message:", error);
      return null;
    }
    return data?.[0] ?? null;
  },

  // ✅ Subscribe to messages in a session
  subscribeToMessages(sessionId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`chat_messages_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => callback(payload)
      )
      .subscribe();

    return channel;
  },

  // ✅ Subscribe to all sessions (support agents need this)
  subscribeToAllSessions(callback: (payload: any) => void) {
    const channel = supabase
      .channel("chat_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        (payload) => callback(payload)
      )
      .subscribe();

    return channel;
  },
};

export default ChatService;
