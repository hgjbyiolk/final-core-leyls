import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Search, Filter, Clock, CheckCircle,
  AlertCircle, User, Send, X, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Tag, Calendar, Users, Settings, 
  MessageCircle, Phone, Mail, FileText, Zap, Star,
  Paperclip, Upload, Eye, Download, Building, Crown,
  Headphones, Shield, LogOut, Bell, Globe, Activity,
  Camera, Archive, UserX, Copy, MoreVertical, Smile,
  Wifi, WifiOff
} from 'lucide-react';
import { ChatService, ChatSession, ChatMessage, ChatParticipant, QuickResponse } from '../services/chatService';

const SupportPortal: React.FC = () => {
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [chatStats, setChatStats] = useState<any>(null);
  const [showQuickResponses, setShowQuickResponses] = useState(false);
  const [quickResponses, setQuickResponses] = useState<QuickResponse[]>([]);
  const [showCloseChatModal, setShowCloseChatModal] = useState(false);
  const [closingChat, setClosingChat] = useState(false);
  
  // Real-time state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSeen, setLastSeen] = useState<Date>(new Date());
  
  // Refs for subscriptions
  const sessionsSubscriptionRef = useRef<any>(null);
  const messagesSubscriptionRef = useRef<any>(null);
  const participantsSubscriptionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('connected');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Heartbeat for presence
  useEffect(() => {
    if (selectedSession && currentAgent) {
      // Update presence every 30 seconds
      heartbeatIntervalRef.current = setInterval(() => {
        ChatService.updateParticipantStatus(selectedSession.id, currentAgent.id, true);
        setLastSeen(new Date());
      }, 30000);

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        // Mark as offline when leaving
        if (selectedSession && currentAgent) {
          ChatService.updateParticipantStatus(selectedSession.id, currentAgent.id, false);
        }
      };
    }
  }, [selectedSession, currentAgent]);

  useEffect(() => {
    // Check if support agent is authenticated
    const agentData = localStorage.getItem('support_agent_data');
    const loginTime = localStorage.getItem('support_agent_login_time');
    
    if (!agentData || !loginTime) {
      window.location.href = '/support-portal-login';
      return;
    }

    // Check if session is still valid (8 hours)
    const loginDate = new Date(loginTime);
    const now = new Date();
    const hoursSinceLogin = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLogin > 8) {
      localStorage.removeItem('support_agent_data');
      localStorage.removeItem('support_agent_login_time');
      window.location.href = '/support-portal-login';
      return;
    }

    const agent = JSON.parse(agentData);
    setCurrentAgent(agent);
    
    // Initialize support portal
    initializeSupportPortal(agent);

    return () => {
      cleanupAllSubscriptions();
    };
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages();
      fetchParticipants();
      setupSessionSubscriptions();
      
      // Mark agent as online in this session
      if (currentAgent) {
        ChatService.updateParticipantStatus(selectedSession.id, currentAgent.id, true);
      }
    } else {
      cleanupSessionSubscriptions();
    }
  }, [selectedSession]);

  const initializeSupportPortal = async (agent: any) => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      
      console.log('🔐 Initializing support portal for agent:', agent.name);
      
      // Set support agent context for database access
      await ChatService.setSupportAgentContext(agent.email);
      
      // Load initial data
      await Promise.all([
        fetchAllSessions(),
        fetchChatStats(),
        fetchQuickResponses()
      ]);
      
      // Setup global subscriptions
      setupGlobalSubscriptions();
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('❌ Error initializing support portal:', error);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSessions = async () => {
    try {
      console.log('🔍 Fetching all chat sessions for support portal');
      const sessionsData = await ChatService.getAllChatSessions();
      console.log('✅ Fetched sessions:', sessionsData.length);
      setSessions(sessionsData);
    } catch (error) {
      console.error('❌ Error fetching sessions:', error);
      setSessions([]);
    }
  };

  const fetchChatStats = async () => {
    try {
      const stats = await ChatService.getChatStats();
      setChatStats(stats);
    } catch (error) {
      console.error('Error fetching chat stats:', error);
    }
  };

  const fetchQuickResponses = async () => {
    try {
      const responses = await ChatService.getQuickResponses();
      setQuickResponses(responses);
    } catch (error) {
      console.error('Error fetching quick responses:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedSession) return;
    
    try {
      console.log('📨 Fetching messages for session:', selectedSession.id);
      const messagesData = await ChatService.getChatMessages(selectedSession.id);
      
      const sortedMessages = messagesData.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      setMessages(sortedMessages);
      console.log('✅ Messages loaded:', sortedMessages.length);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const fetchParticipants = async () => {
    if (!selectedSession) return;
    
    try {
      const participantsData = await ChatService.getChatParticipants(selectedSession.id);
      setParticipants(participantsData);
    } catch (error) {
      console.error('❌ Error fetching participants:', error);
    }
  };

  const cleanupAllSubscriptions = () => {
    cleanupGlobalSubscriptions();
    cleanupSessionSubscriptions();
  };

  const cleanupGlobalSubscriptions = () => {
    if (sessionsSubscriptionRef.current) {
      try {
        ChatService.cleanupSubscription(sessionsSubscriptionRef.current);
      } catch (err) {
        console.warn('⚠️ Error cleaning up sessions subscription:', err);
      }
      sessionsSubscriptionRef.current = null;
    }
  };

  const cleanupSessionSubscriptions = () => {
    if (messagesSubscriptionRef.current) {
      try {
        ChatService.cleanupSubscription(messagesSubscriptionRef.current);
      } catch (err) {
        console.warn('⚠️ Error cleaning up messages subscription:', err);
      }
      messagesSubscriptionRef.current = null;
    }

    if (participantsSubscriptionRef.current) {
      try {
        ChatService.cleanupSubscription(participantsSubscriptionRef.current);
      } catch (err) {
        console.warn('⚠️ Error cleaning up participants subscription:', err);
      }
      participantsSubscriptionRef.current = null;
    }
  };

  const setupGlobalSubscriptions = () => {
    cleanupGlobalSubscriptions();
    setConnectionStatus('connecting');
    
    console.log('🔌 Setting up enhanced global sessions subscription');
    
    try {
      sessionsSubscriptionRef.current = ChatService.subscribeToAllSessions((payload) => {
        console.log('🔄 [REALTIME] Sessions update received:', {
          eventType: payload.eventType,
          sessionId: payload.new?.id || payload.old?.id,
          restaurantId: payload.new?.restaurant_id || payload.old?.restaurant_id,
          timestamp: new Date().toISOString()
        });
        
        setConnectionStatus('connected');
        
        if (payload.eventType === 'INSERT' && payload.new) {
          setSessions(prev => {
            const exists = prev.some(session => session.id === payload.new.id);
            if (exists) {
              console.log('⚠️ Session already exists, skipping duplicate');
              return prev;
            }
            
            console.log('✅ Adding new session to list:', payload.new.title);
            return [payload.new, ...prev].sort((a, b) => 
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          console.log('🔄 Updating existing session:', payload.new.id);
          setSessions(prev => prev.map(session => 
            session.id === payload.new.id ? payload.new : session
          ));
          
          // Update selected session if it's the one being updated
          if (selectedSession?.id === payload.new.id) {
            setSelectedSession(payload.new);
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setSessions(prev => prev.filter(session => session.id !== payload.old.id));
          
          // Clear selected session if it was deleted
          if (selectedSession?.id === payload.old.id) {
            setSelectedSession(null);
          }
        }
      });
      
      console.log('✅ Global sessions subscription established');
    } catch (err) {
      console.error('❌ Failed to setup global subscriptions:', err);
      setConnectionStatus('disconnected');
    }
  };

  const setupSessionSubscriptions = () => {
    if (!selectedSession) return;
    
    cleanupSessionSubscriptions();
    
    console.log('🔌 Setting up enhanced session subscriptions for:', selectedSession.id);
    
    try {
      // Messages subscription
      messagesSubscriptionRef.current = ChatService.subscribeToMessages(
        selectedSession.id,
        (payload) => {
          console.log('📨 [REALTIME] Message update received:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === payload.new.id);
              if (exists) {
                console.log('⚠️ Message already exists, skipping duplicate:', payload.new.id);
                return prev;
              }
              
              const newMessages = [...prev, payload.new].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              console.log('✅ Added new message to list, total:', newMessages.length);
              setTimeout(() => scrollToBottom(), 100);
              
              return newMessages;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id ? payload.new : msg
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          }
        }
      );

      // Participants subscription
      participantsSubscriptionRef.current = ChatService.subscribeToParticipants(
        selectedSession.id,
        (payload) => {
          console.log('👥 [REALTIME] Participants update received:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setParticipants(prev => {
              const exists = prev.some(p => p.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setParticipants(prev => prev.map(p => 
              p.id === payload.new.id ? payload.new : p
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      );
      
      console.log('✅ Session subscriptions established');
    } catch (err) {
      console.error('❌ Failed to setup session subscriptions:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSession || !currentAgent || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    const tempId = `temp_${Date.now()}_${currentAgent.id}`;
    
    // Optimistic message
    const optimisticMessage: ChatMessage = {
      id: tempId,
      session_id: selectedSession.id,
      sender_type: 'support_agent',
      sender_id: currentAgent.id,
      sender_name: currentAgent.name,
      message: messageText,
      message_type: 'text',
      has_attachments: false,
      is_system_message: false,
      created_at: new Date().toISOString()
    };

    // Add optimistic message to UI
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setSendingMessage(true);
    scrollToBottom();

    try {
      const sentMessage = await ChatService.sendMessage({
        session_id: selectedSession.id,
        sender_type: 'support_agent',
        sender_id: currentAgent.id,
        sender_name: currentAgent.name,
        message: messageText
      });

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? sentMessage : msg
      ));

    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove optimistic message on error and restore text
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAssignToSelf = async (session: ChatSession) => {
    if (!currentAgent) return;

    try {
      console.log('👤 Assigning session to agent:', {
        sessionId: session.id,
        agentName: currentAgent.name,
        agentId: currentAgent.id
      });

      // Assign agent to session
      await ChatService.assignAgentToSession(session.id, currentAgent.name, currentAgent.id);
      
      // Add agent as participant if not already added
      try {
        await ChatService.addParticipant(session.id, {
          user_type: 'support_agent',
          user_id: currentAgent.id,
          user_name: currentAgent.name
        });
      } catch (participantError) {
        console.log('ℹ️ Participant may already exist:', participantError);
      }

      // Send system message
      await ChatService.sendMessage({
        session_id: session.id,
        sender_type: 'support_agent',
        sender_id: currentAgent.id,
        sender_name: 'System',
        message: `${currentAgent.name} has joined the conversation`,
        is_system_message: true
      });

      // Select this session
      setSelectedSession(session);
      
      console.log('✅ Session assigned successfully');
    } catch (error) {
      console.error('❌ Error assigning session:', error);
      alert('Failed to assign session');
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!selectedSession || !currentAgent || files.length === 0) return;

    setUploadingFiles(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file type (only images)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File ${file.name} is not supported. Only images are allowed.`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 5MB.`);
        }

        // Create message first
        const message = await ChatService.sendMessage({
          session_id: selectedSession.id,
          sender_type: 'support_agent',
          sender_id: currentAgent.id,
          sender_name: currentAgent.name,
          message: `📷 Shared an image: ${file.name}`,
          message_type: 'image',
          has_attachments: true
        });

        // Upload attachment
        const attachment = await ChatService.uploadAttachment(file, message.id);
        
        // Update the message with attachment info for real-time display
        setMessages(prev => prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, attachments: [attachment] }
            : msg
        ));
      }
    } catch (err: any) {
      console.error('❌ Error uploading files:', err);
      alert(err.message || 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
        
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleQuickResponse = (response: QuickResponse) => {
    setNewMessage(response.message);
    setShowQuickResponses(false);
  };

  const handleCloseChat = async () => {
    if (!selectedSession || !currentAgent) return;

    try {
      setClosingChat(true);
      await ChatService.closeChatSession(selectedSession.id, currentAgent.name);
      setShowCloseChatModal(false);
      // Don't clear selected session - let real-time update handle it
    } catch (error) {
      console.error('Error closing chat:', error);
      alert('Failed to close chat');
    } finally {
      setClosingChat(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('support_agent_data');
    localStorage.removeItem('support_agent_login_time');
    window.location.href = '/support-portal-login';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'resolved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.restaurant?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || session.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Support Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Headphones className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">VOYA Support Portal</h1>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">Agent: {currentAgent?.name}</p>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
                {!isOnline && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <WifiOff className="h-3 w-3" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {chatStats && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  <span>{chatStats.activeSessions} active</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>{chatStats.resolvedToday} resolved today</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>{chatStats.totalRestaurants} restaurants</span>
                </div>
              </div>
            )}
            <button
              onClick={fetchAllSessions}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh Sessions"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Enhanced Sessions Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats or restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            {filteredSessions.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No chat sessions found</p>
                <p className="text-sm text-gray-400">Sessions will appear here when customers start chats</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredSessions.map((session) => {
                  const hasAgent = session.assigned_agent_name;
                  const isAssignedToMe = session.assigned_agent_id === currentAgent?.id;
                  
                  return (
                    <div
                      key={session.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedSession?.id === session.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {session.title}
                            </h3>
                            {isAssignedToMe && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                Mine
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Building className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600 truncate">
                              {session.restaurant?.name || 'Unknown Restaurant'}
                            </span>
                          </div>
                          {hasAgent && (
                            <p className="text-xs text-blue-600 font-medium">
                              Agent: {session.assigned_agent_name}
                            </p>
                          )}
                          {session.status === 'closed' && (
                            <p className="text-xs text-gray-500 font-medium">
                              Chat closed
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(session.priority)}`}>
                          {session.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(session.last_message_at)}
                        </span>
                      </div>
                      
                      {!hasAgent && session.status === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignToSelf(session);
                          }}
                          className="w-full mt-2 py-1 px-3 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Assign to Me
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Chat Area */}
        <div className="flex-1 bg-white flex flex-col">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                      {selectedSession.restaurant?.name?.[0] || 'R'}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedSession.title}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {selectedSession.restaurant?.name || 'Unknown Restaurant'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(selectedSession.status)}`}>
                          {selectedSession.status}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(selectedSession.priority)}`}>
                          {selectedSession.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Participants */}
                    <div className="flex items-center gap-2">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            participant.user_type === 'support_agent'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            participant.is_online ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          {participant.user_name}
                        </div>
                      ))}
                    </div>
                    
                    {/* Chat Actions */}
                    {selectedSession.status === 'active' && (
                      <button
                        onClick={() => setShowCloseChatModal(true)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                      >
                        Close Chat
                      </button>
                    )}
                    
                    <button
                      onClick={fetchMessages}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Refresh Messages"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedSession(null);
                        cleanupSessionSubscriptions();
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Closed Notice */}
              {selectedSession.status === 'closed' && (
                <div className="p-4 bg-gray-100 border-b border-gray-200">
                  <div className="flex items-center gap-3 text-center justify-center">
                    <Archive className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-700 font-medium">This chat has been closed</span>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
              >
                {dragOver && (
                  <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-blue-700 font-medium">Drop images to upload</p>
                    </div>
                  </div>
                )}

                {messages.map((message) => {
                  const isPending = message.id.startsWith('temp_');
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'support_agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${
                        message.sender_type === 'support_agent'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          : 'bg-white border border-gray-200'
                      } rounded-2xl px-4 py-3 shadow-sm ${isPending ? 'opacity-70' : ''}`}>
                        {message.is_system_message ? (
                          <p className="text-center text-xs text-gray-500 italic">
                            {message.message}
                          </p>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${
                                message.sender_type === 'support_agent' ? 'text-white/80' : 'text-gray-600'
                              }`}>
                                {message.sender_name}
                              </span>
                              <span className={`text-xs ${
                                message.sender_type === 'support_agent' ? 'text-white/60' : 'text-gray-400'
                              }`}>
                                {formatTime(message.created_at)}
                              </span>
                              {isPending && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                            </div>
                            <p className="text-sm leading-relaxed">{message.message}</p>
                            
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((attachment) => (
                                  <div key={attachment.id} className="bg-white/10 rounded-lg p-2">
                                    {attachment.file_type.startsWith('image/') ? (
                                      <img
                                        src={attachment.file_url}
                                        alt={attachment.file_name}
                                        className="max-w-full h-auto rounded-lg"
                                        style={{ maxHeight: '200px' }}
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Paperclip className="h-4 w-4" />
                                        <span className="text-xs">{attachment.file_name}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Enhanced Message Input */}
              {selectedSession.status !== 'closed' && (
                <div className="p-4 border-t border-gray-200">
                  {/* Quick Responses */}
                  {showQuickResponses && quickResponses.length > 0 && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Quick Responses</span>
                        <button
                          onClick={() => setShowQuickResponses(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {quickResponses.slice(0, 5).map((response) => (
                          <button
                            key={response.id}
                            onClick={() => handleQuickResponse(response)}
                            className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          >
                            <span className="font-medium">{response.title}</span>
                            <p className="text-xs text-gray-500 truncate">{response.message}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Upload image"
                    >
                      {uploadingFiles ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() => setShowQuickResponses(!showQuickResponses)}
                      className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Quick responses"
                    >
                      <Zap className="h-4 w-4" />
                    </button>
                    
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !sendingMessage) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sendingMessage}
                    />
                    
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Chat Session</h3>
                <p className="text-gray-500 max-w-sm">
                  Choose a chat session to start helping customers across all restaurants
                </p>
                <div className="mt-6 grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {sessions.filter(s => s.status === 'active').length}
                    </p>
                    <p className="text-xs text-gray-600">Active Chats</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {new Set(sessions.map(s => s.restaurant_id)).size}
                    </p>
                    <p className="text-xs text-gray-600">Restaurants</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {sessions.filter(s => s.status === 'resolved').length}
                    </p>
                    <p className="text-xs text-gray-600">Resolved</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close Chat Modal */}
      {showCloseChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Close Chat</h3>
              <button
                onClick={() => setShowCloseChatModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Archive className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Close this chat?</p>
                    <p className="text-blue-800 text-sm">
                      This will mark the chat as resolved and notify the customer. 
                      The conversation will be archived for future reference.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCloseChatModal(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Keep Open
              </button>
              <button
                onClick={handleCloseChat}
                disabled={closingChat}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {closingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Close Chat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportPortal;