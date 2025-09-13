import { useEffect, useState, useRef } from "react";
import ChatService from "../services/ChatService";
import { supabase } from "../supabaseClient";

function SupportUI({ selectedSession }: { selectedSession: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messageChannelRef = useRef<any>(null);

  // Load logged-in user info
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
      } else {
        console.error("❌ Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  // Load initial messages + subscribe to updates
  useEffect(() => {
    if (!selectedSession?.id) return;

    let isMounted = true;

    const loadMessages = async () => {
      console.log("📥 Fetching messages for session:", selectedSession.id);
      const data = await ChatService.getMessages(selectedSession.id);
      if (isMounted && data) setMessages(data);
    };

    loadMessages();

    const channel = ChatService.subscribeToMessages(
      selectedSession.id,
      (payload) => {
        console.log("📨 Message event:", payload);

        if (payload.eventType === "INSERT" && payload.new) {
          setMessages((prev) => [...prev, payload.new]);
        } else if (payload.eventType === "UPDATE" && payload.new) {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg))
          );
        } else if (payload.eventType === "DELETE" && payload.old) {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      }
    );

    messageChannelRef.current = channel;

    return () => {
      isMounted = false;
      console.log("🔴 Cleaning up messages subscription");
      if (messageChannelRef.current) {
        messageChannelRef.current.unsubscribe();
        messageChannelRef.current = null;
      }
    };
  }, [selectedSession]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const sent = await ChatService.sendMessage(
      selectedSession.id,
      "support_agent", // or "restaurant_manager" depending on role
      currentUser.id,
      currentUser.email || "Anonymous",
      newMessage.trim()
    );

    if (sent) {
      setNewMessage("");
    }
  };

  return (
    <div className="support-ui flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto border rounded p-3 mb-3 bg-white">
        {messages.length === 0 && (
          <p className="text-gray-500">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 my-1 rounded ${
              msg.sender_id === currentUser?.id
                ? "bg-blue-100 text-right"
                : "bg-gray-100 text-left"
            }`}
          >
            <div className="text-sm font-semibold">{msg.sender_name}</div>
            <div>{msg.message}</div>
            <div className="text-xs text-gray-500">
              {new Date(msg.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Input box */}
      <div className="flex">
        <input
          type="text"
          className="flex-1 border rounded-l p-2"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 rounded-r"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default SupportUI;
