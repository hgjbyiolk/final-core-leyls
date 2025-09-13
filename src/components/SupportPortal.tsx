// --- components/SupportPortal.tsx ---

import { useEffect, useState, useRef } from "react";
import ChatService from "../services/ChatService";
import SupportUI from "./SupportUI";

function SupportPortal() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const sessionChannelRef = useRef<any>(null);

  // Initial fetch + real-time sync
  useEffect(() => {
    let isMounted = true;

    // 1. Load initial sessions
    const fetchSessions = async () => {
      console.log("📥 Fetching initial chat sessions");
      const data = await ChatService.getChatSessions();
      if (isMounted && data) setSessions(data);
    };

    fetchSessions();

    // 2. Subscribe to sessions
    const channel = ChatService.subscribeToAllSessions((payload) => {
      console.log("🔄 Session event:", payload);

      if (payload.eventType === "INSERT" && payload.new) {
        setSessions((prev) => [...prev, payload.new]);
      } else if (payload.eventType === "UPDATE" && payload.new) {
        setSessions((prev) =>
          prev.map((s) => (s.id === payload.new.id ? payload.new : s))
        );
      } else if (payload.eventType === "DELETE" && payload.old) {
        setSessions((prev) => prev.filter((s) => s.id !== payload.old.id));
      }
    });

    sessionChannelRef.current = channel;

    // Cleanup
    return () => {
      isMounted = false;
      console.log("🔴 Cleaning up session subscription");
      if (sessionChannelRef.current) {
        sessionChannelRef.current.unsubscribe();
        sessionChannelRef.current = null;
      }
    };
  }, []);

  return (
    <div className="support-portal flex">
      {/* Sidebar with sessions */}
      <div className="sessions-list w-1/3 border-r p-4">
        <h2 className="text-lg font-bold mb-2">Active Chats</h2>
        {sessions.length === 0 && <p>No active chats yet</p>}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`p-2 border rounded mb-2 cursor-pointer ${
              selectedSession?.id === session.id ? "bg-gray-200" : ""
            }`}
            onClick={() => setSelectedSession(session)}
          >
            <strong>{session.title || "Support Chat"}</strong>
            <br />
            <span className="text-sm text-gray-600">Status: {session.status}</span>
          </div>
        ))}
      </div>

      {/* Chat view */}
      <div className="chat-view w-2/3 p-4">
        {selectedSession ? (
          <SupportUI selectedSession={selectedSession} />
        ) : (
          <p className="text-gray-500">Select a session to view messages</p>
        )}
      </div>
    </div>
  );
}

export default SupportPortal;
