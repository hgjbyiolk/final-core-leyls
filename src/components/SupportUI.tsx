import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Search, Filter, Clock, CheckCircle,
  AlertCircle, User, Send, X, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Tag, Calendar, Users, Settings, 
  MessageCircle, Phone, Mail, FileText, Zap, Star,
  Paperclip, Upload, Eye, Download, Building, Crown
} from 'lucide-react';
import { ChatService, ChatSession, ChatMessage, ChatParticipant } from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';

const SupportUI: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [newSessionData, setNewSessionData] = useState({
    title: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'general'
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // Refs for subscriptions and auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionsSubscriptionRef = useRef<any>(null);
  const messagesSubscriptionRef = useRef<any>(null);
  const participantsSubscriptionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, restaurant } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (restaurant) {
      fetchSessions();
      setupGlobalSubscriptions();
    }
    
    return () => {
      cleanupAllSubscriptions();
    };
  }, [restaurant]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages();
      fetchParticipants();
      setupSessionSubscriptions();
    } else {
      cleanupSessionSubscriptions();
    }
  }, [selectedSession]);

  const cleanupAllSubscriptions = () => {
    cleanupGlobalSubscriptions();
    cleanupSessionSubscriptions();
  };

  const cleanupGlobalSubscriptions = () => {
    if (sessionsSubscriptionRef.current) {
      try {
        sessionsSubscriptionRef.current.unsubscribe();
      } catch (err) {
        console.warn('Error unsubscribing from sessions:', err);
      }
      sessionsSubscriptionRef.current = null;
    }
  };

  const cleanupSessionSubscriptions = () => {
    if (messagesSubscriptionRef.current) {
      try {
        messagesSubscriptionRef.current.unsubscribe();
      } catch (err) {
        console.warn('Error unsubscribing from messages:', err);
      }
      messagesSubscriptionRef.current = null;
    }

    if (participantsSubscriptionRef.current) {
      try {
        participantsSubscriptionRef.current.unsubscribe();
      } catch (err) {
        console.warn('Error unsubscribing from participants:', err);
      }
      participantsSubscriptionRef.current = null;
    }
  };

  const setupGlobalSubscriptions = () => {
    if (!restaurant) return;
    
    cleanupGlobalSubscriptions();
    setConnectionStatus('connecting');
    
    console.log('🔌 Setting up sessions subscription for restaurant:', restaurant.id);
    
    try {
      sessionsSubscriptionRef.current = ChatService.subscribeToAllSessions((payload) => {
        console.log('🔄 Sessions update:', payload);
        setConnectionStatus('connected');
        
        if (payload.eventType === 'INSERT' && payload.new) {
          // Only add sessions for this restaurant
          if (payload.new.restaurant_id === restaurant.id) {
            setSessions(prev => {
              const exists = prev.some(session => session.id === payload.new.id);
              if (exists) return prev;
              
              return [payload.new, ...prev].sort((a, b) => 
                new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
              );
            });
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setSessions(prev => prev.map(session => 
            session.id === payload.new.id ? payload.new : session
          ));
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
    
    console.log('🔌 Setting up session subscriptions for:', selectedSession.id);
    
    try {
      // Subscribe to messages - FIXED: Simplified message handling
      messagesSubscriptionRef.current = ChatService.subscribeToMessages(
        selectedSession.id,
        (payload) => {
          console.log('📨 Message update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === payload.new.id);
              if (exists) return prev;
              
              // FIXED: Always add new messages from real-time subscription
              // Remove the problematic optimistic message filtering
              const newMessages = [...prev, payload.new].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              // Auto-scroll to bottom for new messages
              setTimeout(() => scrollToBottom(), 100);
              
              return newMessages;
            });
          }
        }
      );

      // Subscribe to participants
      participantsSubscriptionRef.current = ChatService.subscribeToParticipants(
        selectedSession.id,
        (payload) => {
          console.log('👥 Participants update:', payload);
          
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
          }
        }
      );
      
      console.log('✅ Session subscriptions established');
    } catch (err) {
      console.error('❌ Failed to setup session subscriptions:', err);
    }
  };

  const fetchSessions = async () => {
    if (!restaurant) return;
    
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      const sessionsData = await ChatService.getRestaurantChatSessions(restaurant.id);
      setSessions(sessionsData);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedSession) return;
    
    try {
      const messagesData = await ChatService.getChatMessages(selectedSession.id);
      setMessages(messagesData.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchParticipants = async () => {
    if (!selectedSession) return;
    
    try {
      const participantsData = await ChatService.getChatParticipants(selectedSession.id);
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleCreateSession = async () => {
    if (!restaurant || !user) return;

    try {
      setCreateLoading(true);
      
      if (!newSessionData.title.trim()) {
        alert('Please enter a chat title');
        return;
      }

      const session = await ChatService.createChatSession({
        restaurant_id: restaurant.id,
        title: newSessionData.title,
        priority: newSessionData.priority,
        category: newSessionData.category,
        created_by_user_id: user.id
      });

      // Add restaurant manager as participant
      await ChatService.addParticipant(session.id, {
        user_type: 'restaurant_manager',
        user_id: user.id,
        user_name: user.email?.split('@')[0] || 'Restaurant Manager'
      });

      setNewSessionData({
        title: '',
        priority: 'medium',
        category: 'general'
      });
      setShowCreateSession(false);
      await fetchSessions();
      setSelectedSession(session);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create chat session');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSession || !user || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    const tempId = `temp_${Date.now()}_${user.id}`;
    
    // Optimistically add message to UI immediately
    const optimisticMessage: ChatMessage = {
      id: tempId,
      session_id: selectedSession.id,
      sender_type: 'restaurant_manager',
      sender_id: user.id,
      sender_name: user.email?.split('@')[0] || 'Restaurant Manager',
      message: messageText,
      message_type: 'text',
      has_attachments: false,
      is_system_message: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setSendingMessage(true);
    scrollToBottom();

    try {
      const sentMessage = await ChatService.sendMessage({
        session_id: selectedSession.id,
        sender_type: 'restaurant_manager',
        sender_id: user.id,
        sender_name: user.email?.split('@')[0] || 'Restaurant Manager',
        message: messageText
      });

      // FIXED: Replace optimistic message with real one
      // Use a more specific check to match the correct optimistic message
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? sentMessage : msg
      ));

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error and restore text
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!selectedSession || !user || files.length === 0) return;

    setUploadingFiles(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
        }

        // For demo, we'll just send a message about the file
        await ChatService.sendMessage({
          session_id: selectedSession.id,
          sender_type: 'restaurant_manager',
          sender_id: user.id,
          sender_name: user.email?.split('@')[0] || 'Restaurant Manager',
          message: `📎 Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
          message_type: 'file'
        });
      }
    } catch (err: any) {
      console.error('Error uploading files:', err);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || session.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Support</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-600">Real-time chat with our support team</p>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSessions}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowCreateSession(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-xl hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Start New Chat
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
        {/* Sessions Sidebar */}
        <div className="bg-white border border-gray-200 rounded-xl flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent"
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
            {loading ? (
              <div className="p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-gray-500">Loading chats...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No chat sessions found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredSessions.map((session) => {
                  const hasAgent = session.assigned_agent_name;
                  
                  return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedSession?.id === session.id ? 'bg-gradient-to-r from-[#E6A85C]/10 via-[#E85A9B]/10 to-[#D946EF]/10 border-r-2 border-[#E6A85C]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {session.title}
                        </h3>
                        {hasAgent && (
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            Agent: {session.assigned_agent_name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
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
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl flex flex-col">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#E6A85C] to-[#E85A9B] rounded-lg flex items-center justify-center text-white font-bold">
                      {restaurant?.name?.[0] || 'R'}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedSession.title}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(selectedSession.status)}`}>
                          {selectedSession.status}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(selectedSession.priority)}`}>
                          {selectedSession.priority}
                        </span>
                        {selectedSession.assigned_agent_name && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                            Agent: {selectedSession.assigned_agent_name}
                          </span>
                        )}
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
                    <div className="flex items-center gap-2 mt-1">
                      <Upload className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-blue-700 font-medium">Drop files to upload</p>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'restaurant_manager' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${
                      message.sender_type === 'restaurant_manager'
                        ? 'bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] text-white'
                        : 'bg-white border border-gray-200'
                    } rounded-2xl px-4 py-3 shadow-sm`}>
                      {message.is_system_message ? (
                        <p className="text-center text-xs text-gray-500 italic">
                          {message.message}
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${
                              message.sender_type === 'restaurant_manager' ? 'text-white/80' : 'text-gray-600'
                            }`}>
                              {message.sender_name}
                            </span>
                            <span className={`text-xs ${
                              message.sender_type === 'restaurant_manager' ? 'text-white/60' : 'text-gray-400'
                            }`}>
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{message.message}</p>
                          
                          {message.has_attachments && (
                            <div className="mt-2 p-2 bg-white/10 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4" />
                                <span className="text-xs">Attachment</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles}
                    className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Attach files"
                  >
                    {uploadingFiles ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
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
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent"
                    disabled={sendingMessage}
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Chat Session</h3>
                <p className="text-gray-500 max-w-sm">
                  Choose a chat session to start or continue the conversation with our support team
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {sessions.filter(s => s.status === 'active').length}
                    </p>
                    <p className="text-xs text-gray-600">Active Chats</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {sessions.filter(s => s.assigned_agent_name).length}
                    </p>
                    <p className="text-xs text-gray-600">With Agent</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Start New Chat</h3>
              <button
                onClick={() => setShowCreateSession(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat Title *
                </label>
                <input
                  type="text"
                  value={newSessionData.title}
                  onChange={(e) => setNewSessionData({ ...newSessionData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent"
                  placeholder="e.g., Help with loyalty program setup"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newSessionData.priority}
                    onChange={(e) => setNewSessionData({ ...newSessionData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newSessionData.category}
                    onChange={(e) => setNewSessionData({ ...newSessionData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="bug_report">Bug Report</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateSession(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={createLoading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {createLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Start Chat
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
 
export default SupportUI; 