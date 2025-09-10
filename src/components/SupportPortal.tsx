import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Users, Building, Search, Filter, Send, 
  Paperclip, Image, File, X, Download, Eye, MoreVertical,
  Clock, CheckCircle, AlertCircle, User, Phone, Mail,
  Settings, LogOut, RefreshCw, Bell, Minimize2, Maximize2,
  ArrowLeft, Plus, Star, Shield, Zap, Crown, Award,
  Loader2, Upload, FileText, Camera, Mic, Video,
  Hash, Calendar, Tag, Flag, UserCheck, MessageCircle,
  Activity, TrendingUp, BarChart3, PieChart, Target
} from 'lucide-react';
import { ChatService, ChatSession, ChatMessage, ChatParticipant } from '../services/chatService';

interface SupportAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at?: string;
}

const SupportPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<SupportAgent | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', name: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Chat state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [sessionToJoin, setSessionToJoin] = useState<ChatSession | null>(null);
  const [agentName, setAgentName] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // File upload state
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Refs for real-time subscriptions
  const sessionsSubscriptionRef = useRef<any>(null);
  const messagesSubscriptionRef = useRef<any>(null);
  const participantsSubscriptionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentAgent) {
      loadSessions();
      setupGlobalSubscriptions();
    }

    return () => {
      cleanupAllSubscriptions();
    };
  }, [isAuthenticated, currentAgent]);

  useEffect(() => {
    if (selectedSession) {
      loadMessages();
      loadParticipants();
      setupSessionSubscriptions();
    } else {
      cleanupSessionSubscriptions();
    }
  }, [selectedSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuthentication = () => {
    const agentData = localStorage.getItem('support_agent_data');
    const loginTime = localStorage.getItem('support_agent_login_time');
    
    if (agentData && loginTime) {
      const loginDate = new Date(loginTime);
      const now = new Date();
      const hoursSinceLogin = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLogin < 24) {
        const agent = JSON.parse(agentData);
        setCurrentAgent(agent);
        setIsAuthenticated(true);
        return;
      }
    }
    
    // Clear expired session
    localStorage.removeItem('support_agent_data');
    localStorage.removeItem('support_agent_login_time');
    setIsAuthenticated(false);
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password || !loginForm.name) {
      setLoginError('Please fill in all fields');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      // For demo purposes, accept any email/password combination
      // In production, this would validate against the support_agents table
      const agent: SupportAgent = {
        id: `agent_${Date.now()}`,
        name: loginForm.name,
        email: loginForm.email,
        role: 'agent',
        is_active: true
      };

      localStorage.setItem('support_agent_data', JSON.stringify(agent));
      localStorage.setItem('support_agent_login_time', new Date().toISOString());
      
      setCurrentAgent(agent);
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('support_agent_data');
    localStorage.removeItem('support_agent_login_time');
    cleanupAllSubscriptions();
    setIsAuthenticated(false);
    setCurrentAgent(null);
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      const sessionsData = await ChatService.getAllChatSessions();
      setSessions(sessionsData);
      setConnectionStatus('connected');
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError('Failed to load chat sessions');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedSession) return;

    try {
      const messagesData = await ChatService.getChatMessages(selectedSession.id);
      setMessages(messagesData.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
    } catch (err: any) {
      console.error('Error loading messages:', err);
    }
  };

  const loadParticipants = async () => {
    if (!selectedSession) return;

    try {
      const participantsData = await ChatService.getChatParticipants(selectedSession.id);
      setParticipants(participantsData);
    } catch (err: any) {
      console.error('Error loading participants:', err);
    }
  };

  const setupGlobalSubscriptions = () => {
    cleanupGlobalSubscriptions();
    setConnectionStatus('connecting');

    try {
      // Subscribe to all chat sessions
      sessionsSubscriptionRef.current = ChatService.subscribeToAllSessions((payload) => {
        console.log('🔄 Sessions update:', payload);
        setConnectionStatus('connected');
        
        if (payload.eventType === 'INSERT' && payload.new) {
          setSessions(prev => {
            const exists = prev.some(s => s.id === payload.new.id);
            if (exists) return prev;
            return [payload.new, ...prev].sort((a, b) => 
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setSessions(prev => prev.map(s => 
            s.id === payload.new.id ? payload.new : s
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

    try {
      // Subscribe to messages for selected session
      messagesSubscriptionRef.current = ChatService.subscribeToMessages(
        selectedSession.id,
        (payload) => {
          console.log('📨 Message update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === payload.new.id);
              if (exists) return prev;
              
              const newMessages = [...prev, payload.new].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              // Auto-scroll to bottom
              setTimeout(() => scrollToBottom(), 100);
              
              return newMessages;
            });
          }
        }
      );

      // Subscribe to participants for selected session
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleJoinSession = (session: ChatSession) => {
    setSessionToJoin(session);
    setAgentName(currentAgent?.name || '');
    setShowJoinModal(true);
  };

  const confirmJoinSession = async () => {
    if (!sessionToJoin || !currentAgent || !agentName.trim()) return;

    try {
      // Update session with agent assignment
      await ChatService.assignAgentToSession(sessionToJoin.id, agentName.trim(), currentAgent.id);
      
      // Add agent as participant
      await ChatService.addParticipant(sessionToJoin.id, {
        user_type: 'support_agent',
        user_id: currentAgent.id,
        user_name: agentName.trim()
      });

      // Send system message
      await ChatService.sendMessage({
        session_id: sessionToJoin.id,
        sender_type: 'support_agent',
        sender_id: currentAgent.id,
        sender_name: agentName.trim(),
        message: `${agentName.trim()} has joined the chat`,
        is_system_message: true
      });

      setSelectedSession(sessionToJoin);
      setShowJoinModal(false);
      setSessionToJoin(null);
      
      // Refresh sessions to show updated assignment
      await loadSessions();
    } catch (err: any) {
      console.error('Error joining session:', err);
      setError('Failed to join chat session');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSession || !currentAgent || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    try {
      await ChatService.sendMessage({
        session_id: selectedSession.id,
        sender_type: 'support_agent',
        sender_id: currentAgent.id,
        sender_name: currentAgent.name,
        message: messageText
      });
    } catch (err: any) {
      console.error('Error sending message:', err);
      setNewMessage(messageText); // Restore message on error
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!selectedSession || !currentAgent || files.length === 0) return;

    setUploadingFiles(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
        }

        // For demo, we'll just send a message about the file
        // In production, you'd upload to Supabase Storage
        await ChatService.sendMessage({
          session_id: selectedSession.id,
          sender_type: 'support_agent',
          sender_id: currentAgent.id,
          sender_name: currentAgent.name,
          message: `📎 Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
          message_type: 'file'
        });
      }
    } catch (err: any) {
      console.error('Error uploading files:', err);
      setError(err.message || 'Failed to upload files');
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

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.restaurant?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || session.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

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

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <MessageSquare className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 font-['Space_Grotesk']">
                VOYA Support Portal
              </h1>
              <p className="text-gray-600">
                Professional support agent dashboard
              </p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                {loginError}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={loginForm.name}
                    onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                    placeholder="Your display name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                    placeholder="agent@voya.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Access Support Portal
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-600 text-center">
                Demo: Use any email/password combination to access the support portal
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Support Portal
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-['Space_Grotesk']">
                VOYA Support Portal
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Agent: {currentAgent?.name}</span>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <Activity className="h-4 w-4" />
              {sessions.filter(s => s.status === 'active').length} active chats
            </div>
            <button
              onClick={loadSessions}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button
            onClick={() => setError('')}
            className="ml-auto p-1 hover:bg-red-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sessions Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
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
                  const isAssigned = session.assigned_agent_name;
                  const isAssignedToMe = session.assigned_agent_id === currentAgent?.id;
                  const unreadCount = unreadCounts[session.id] || 0;

                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors relative ${
                        selectedSession?.id === session.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {session.title}
                            </h3>
                            {unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {session.restaurant?.name || 'Unknown Restaurant'}
                          </p>
                          {isAssigned && (
                            <p className="text-xs text-blue-600 font-medium">
                              {isAssignedToMe ? 'Assigned to you' : `Assigned to ${session.assigned_agent_name}`}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(session.priority)}`}>
                            {session.priority}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDate(session.last_message_at)}
                        </span>
                        {!isAssigned && session.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinSession(session);
                            }}
                            className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors font-medium"
                          >
                            Join Chat
                          </button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {selectedSession.restaurant?.name?.[0] || 'R'}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedSession.title}</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{selectedSession.restaurant?.name}</span>
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
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-blue-700 font-medium">Drop files to upload</p>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'support_agent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${
                      message.sender_type === 'support_agent'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
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
                              message.sender_type === 'support_agent' ? 'text-white/80' : 'text-gray-600'
                            }`}>
                              {message.sender_name}
                            </span>
                            <span className={`text-xs ${
                              message.sender_type === 'support_agent' ? 'text-white/60' : 'text-gray-400'
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
              <div className="p-4 border-t border-gray-200 bg-white">
                {!selectedSession.assigned_agent_name ? (
                  <div className="text-center py-4">
                    <button
                      onClick={() => handleJoinSession(selectedSession)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Join This Chat
                    </button>
                  </div>
                ) : (
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
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Chat Session</h3>
                <p className="text-gray-500 max-w-sm">
                  Choose a chat session from the sidebar to start helping customers
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {sessions.filter(s => s.status === 'active').length}
                    </p>
                    <p className="text-xs text-gray-600">Active Chats</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {sessions.filter(s => s.status === 'resolved').length}
                    </p>
                    <p className="text-xs text-gray-600">Resolved Today</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Join Session Modal */}
      {showJoinModal && sessionToJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Join Support Chat</h3>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSessionToJoin(null);
                  setAgentName('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 mb-2">Chat Details</h4>
                <p className="text-blue-800 font-medium">{sessionToJoin.title}</p>
                <p className="text-blue-700 text-sm">{sessionToJoin.restaurant?.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(sessionToJoin.status)}`}>
                    {sessionToJoin.status}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(sessionToJoin.priority)}`}>
                    {sessionToJoin.priority}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name (visible to customer)
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Sarah (Support Team)"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  This name will be shown to the restaurant manager
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSessionToJoin(null);
                  setAgentName('');
                }}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmJoinSession}
                disabled={!agentName.trim()}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Join Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportPortal;