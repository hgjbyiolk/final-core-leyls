import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Search, Filter, Clock, CheckCircle,
  AlertCircle, User, Send, X, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Tag, Calendar, Users, Settings,
  MessageCircle, Phone, Mail, FileText, Zap, Star,
  Paperclip, Image, File, Download, Eye, Trash2,
  UserCheck, UserX, Circle, Minimize2, Maximize2
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageSubscriptionRef = useRef<any>(null);
  const sessionSubscriptionRef = useRef<any>(null);
  const participantSubscriptionRef = useRef<any>(null);

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
      setupSessionSubscription();
    }
    
    return () => {
      cleanupSubscriptions();
    };
  }, [restaurant]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages();
      fetchParticipants();
      setupMessageSubscription();
      setupParticipantSubscription();
      markAsRead();
    } else {
      cleanupMessageSubscription();
      cleanupParticipantSubscription();
    }
  }, [selectedSession]);

  const cleanupSubscriptions = () => {
    cleanupMessageSubscription();
    cleanupSessionSubscription();
    cleanupParticipantSubscription();
  };

  const cleanupMessageSubscription = () => {
    if (messageSubscriptionRef.current) {
      messageSubscriptionRef.current.unsubscribe();
      messageSubscriptionRef.current = null;
    }
  };

  const cleanupSessionSubscription = () => {
    if (sessionSubscriptionRef.current) {
      sessionSubscriptionRef.current.unsubscribe();
      sessionSubscriptionRef.current = null;
    }
  };

  const cleanupParticipantSubscription = () => {
    if (participantSubscriptionRef.current) {
      participantSubscriptionRef.current.unsubscribe();
      participantSubscriptionRef.current = null;
    }
  };

  const setupSessionSubscription = () => {
    if (!restaurant) return;
    
    cleanupSessionSubscription();
    
    sessionSubscriptionRef.current = ChatService.subscribeToChatSessions((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
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
          session.id === payload.new.id ? { ...session, ...payload.new } : session
        ));
      }
    });
  };

  const setupMessageSubscription = () => {
    if (!selectedSession) return;
    
    cleanupMessageSubscription();
    
    messageSubscriptionRef.current = ChatService.subscribeToMessages(
      selectedSession.id,
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === payload.new.id);
            if (exists) return prev;
            
            return [...prev, payload.new].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      }
    );
  };

  const setupParticipantSubscription = () => {
    if (!selectedSession) return;
    
    cleanupParticipantSubscription();
    
    participantSubscriptionRef.current = ChatService.subscribeToParticipants(
      selectedSession.id,
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setParticipants(prev => {
            const exists = prev.some(p => p.user_id === payload.new.user_id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setParticipants(prev => prev.map(p => 
            p.user_id === payload.new.user_id ? payload.new : p
          ));
        }
      }
    );
  };

  const fetchSessions = async () => {
    if (!restaurant) return;
    
    try {
      setLoading(true);
      const sessionsData = await ChatService.getRestaurantChatSessions(restaurant.id);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedSession) return;
    
    try {
      const messagesData = await ChatService.getChatMessages(selectedSession.id);
      setMessages(messagesData);
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

  const markAsRead = async () => {
    if (!selectedSession || !user) return;
    
    try {
      await ChatService.markMessagesAsRead(selectedSession.id, user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
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

      setNewSessionData({
        title: '',
        priority: 'medium',
        category: 'general'
      });
      setShowCreateSession(false);
      await fetchSessions();
      setSelectedSession(session);
    } catch (error) {
      console.error('Error creating chat session:', error);
      alert('Failed to create chat session');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSession || !user || (!newMessage.trim() && attachments.length === 0)) return;

    try {
      setSendingMessage(true);
      
      const userName = user.user_metadata?.first_name && user.user_metadata?.last_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
        : user.email?.split('@')[0] || 'Restaurant Manager';

      await ChatService.sendMessage({
        session_id: selectedSession.id,
        sender_type: 'restaurant_manager',
        sender_id: user.id,
        sender_name: userName,
        message: newMessage.trim() || 'Sent attachments',
        message_type: attachments.length > 0 ? 'file' : 'text',
        attachments: attachments.length > 0 ? attachments : undefined
      });

      setNewMessage('');
      setAttachments([]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      // Allow images, documents, and text files up to 10MB
      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || session.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const onlineParticipants = participants.filter(p => p.is_online);
  const adminParticipants = participants.filter(p => p.user_type === 'super_admin' && p.is_online);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Support Chat</h1>
          <p className="text-gray-600">Get real-time help with your loyalty program</p>
        </div>
        <button
          onClick={() => setShowCreateSession(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-xl hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          Start New Chat
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* Chat Sessions Sidebar */}
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
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading chats...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No chat sessions found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors relative ${
                      selectedSession?.id === session.id ? 'bg-gradient-to-r from-[#E6A85C]/10 via-[#E85A9B]/10 to-[#D946EF]/10 border-r-2 border-[#E6A85C]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {session.title}
                      </h3>
                      <div className="flex gap-1">
                        {session.unread_count && session.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                            {session.unread_count}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                    
                    {session.last_message && (
                      <p className="text-xs text-gray-600 line-clamp-1 mb-2">
                        <span className="font-medium">{session.last_message.sender_name}:</span> {session.last_message.message}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(session.priority)}`}>
                        {session.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(session.last_message_at)}
                      </span>
                    </div>

                    {session.assigned_admin_name && (
                      <div className="flex items-center gap-1 mt-2">
                        <UserCheck className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">{session.assigned_admin_name}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl flex flex-col">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold text-gray-900">{selectedSession.title}</h2>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedSession.status)}`}>
                          {selectedSession.status}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(selectedSession.priority)}`}>
                          {selectedSession.priority}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">
                        Created {formatDate(selectedSession.created_at)}
                      </span>
                      
                      {/* Online Participants */}
                      {onlineParticipants.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Circle className="h-2 w-2 text-green-500 fill-current" />
                            <span className="text-xs text-gray-500">
                              {onlineParticipants.length} online
                            </span>
                          </div>
                          {adminParticipants.length > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              Support: {adminParticipants.map(p => p.user_name).join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSession(null);
                        cleanupMessageSubscription();
                        cleanupParticipantSubscription();
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 min-h-0 ${isMinimized ? 'h-20' : ''}`}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'restaurant_manager' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${
                      message.sender_type === 'restaurant_manager'
                        ? 'bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] text-white rounded-2xl rounded-br-md'
                        : message.is_system_message
                        ? 'bg-gray-100 text-gray-700 rounded-lg'
                        : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                    } px-4 py-3`}>
                      {!message.is_system_message && (
                        <p className={`text-xs mb-1 ${
                          message.sender_type === 'restaurant_manager' ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          {message.sender_name}
                        </p>
                      )}
                      
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      
                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="bg-white/10 rounded-lg p-2">
                              <div className="flex items-center gap-2">
                                {attachment.file_type.startsWith('image/') ? (
                                  <Image className="h-4 w-4" />
                                ) : (
                                  <File className="h-4 w-4" />
                                )}
                                <span className="text-xs font-medium">{attachment.file_name}</span>
                                <span className="text-xs opacity-70">({formatFileSize(attachment.file_size)})</span>
                                <a
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs hover:underline flex items-center gap-1"
                                >
                                  <Download className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className={`text-xs mt-2 ${
                        message.sender_type === 'restaurant_manager' ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* File Upload Area */}
              {attachments.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                        {file.type.startsWith('image/') ? (
                          <Image className="h-4 w-4 text-blue-600" />
                        ) : (
                          <File className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div 
                className={`p-4 border-t border-gray-200 ${dragOver ? 'bg-blue-50' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
              >
                <div className="flex gap-2">
                  <div className="flex-1 relative">
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E6A85C] focus:border-transparent pr-12"
                      disabled={sendingMessage}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || (!newMessage.trim() && attachments.length === 0)}
                    className="px-6 py-3 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                
                {dragOver && (
                  <div className="absolute inset-0 bg-blue-100/50 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <Paperclip className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-blue-700 font-medium">Drop files here to attach</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Chat</h3>
                <p className="text-gray-500">Choose a chat session to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Chat Session Modal */}
      {showCreateSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
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
                  placeholder="Brief description of your issue"
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
                    <MessageSquare className="h-4 w-4" />
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