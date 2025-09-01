import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Building, DollarSign, TrendingUp, BarChart3, 
  MessageSquare, Settings, RefreshCw, Search, Filter,
  Crown, Award, ChefHat, AlertCircle, CheckCircle,
  Clock, Eye, MoreVertical, UserPlus, Send, X,
  Loader2, FileText, Download, Image, File, Paperclip,
  UserCheck, Circle, Bell, Star, Gift, Target, UserX, MessageCircle 
} from 'lucide-react';
import { SubscriptionService } from '../services/subscriptionService';
import { ChatService, ChatSession, ChatMessage, ChatParticipant } from '../services/chatService';

const SuperAdminUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'support'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Overview data
  const [systemStats, setSystemStats] = useState<any>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<any>(null);
  
  // Subscriptions data
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  
  // Support data
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportFilter, setSupportFilter] = useState('all');
  const [adminName, setAdminName] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [sessionToJoin, setSessionToJoin] = useState<ChatSession | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageSubscriptionRef = useRef<any>(null);
  const sessionSubscriptionRef = useRef<any>(null);
  const participantSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    // Check super admin authentication
    const isAuthenticated = localStorage.getItem('super_admin_authenticated');
    if (!isAuthenticated) {
      window.location.href = '/super-admin-login';
      return;
    }

    loadData();
    setupRealtimeSubscriptions();

    return () => {
      cleanupSubscriptions();
    };
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages();
      fetchParticipants();
      setupMessageSubscription();
      setupParticipantSubscription();
    } else {
      cleanupMessageSubscription();
      cleanupParticipantSubscription();
    }
  }, [selectedSession]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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

  const setupRealtimeSubscriptions = () => {
    setupSessionSubscription();
  };

  const setupSessionSubscription = () => {
    cleanupSessionSubscription();
    
    sessionSubscriptionRef.current = ChatService.subscribeToChatSessions((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        setChatSessions(prev => {
          const exists = prev.some(session => session.id === payload.new.id);
          if (exists) return prev;
          
          return [payload.new, ...prev].sort((a, b) => 
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
        });
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        setChatSessions(prev => prev.map(session => 
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

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [systemStatsData, subscriptionStatsData, subscriptionsData, chatSessionsData] = await Promise.all([
        SubscriptionService.getSystemWideStats(),
        SubscriptionService.getSubscriptionStats(),
        SubscriptionService.getAllSubscriptions(),
        ChatService.getAllChatSessions()
      ]);

      setSystemStats(systemStatsData);
      setSubscriptionStats(subscriptionStatsData);
      setSubscriptions(subscriptionsData);
      setChatSessions(chatSessionsData);
    } catch (err: any) {
      console.error('Error loading super admin data:', err);
      setError('Failed to load dashboard data');
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

  const handleJoinChat = async () => {
    if (!sessionToJoin || !adminName.trim()) return;

    try {
      const adminId = `admin_${Date.now()}`;
      
      await ChatService.joinChatSession(sessionToJoin.id, adminId, adminName);
      
      setSelectedSession(sessionToJoin);
      setShowJoinModal(false);
      setSessionToJoin(null);
      setAdminName('');
      
      // Refresh sessions to show updated assignment
      await loadData();
    } catch (error) {
      console.error('Error joining chat:', error);
      alert('Failed to join chat session');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSession || (!newMessage.trim() && attachments.length === 0)) return;

    try {
      setSendingMessage(true);
      
      // Get admin name from participants or use stored name
      const adminParticipant = participants.find(p => p.user_type === 'super_admin');
      const senderName = adminParticipant?.user_name || 'Support Agent';
      const senderId = adminParticipant?.user_id || `admin_${Date.now()}`;

      await ChatService.sendMessage({
        session_id: selectedSession.id,
        sender_type: 'super_admin',
        sender_id: senderId,
        sender_name: senderName,
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
      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024;
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(supportSearch.toLowerCase()) ||
                         session.restaurant?.name.toLowerCase().includes(supportSearch.toLowerCase());
    const matchesStatus = supportFilter === 'all' || session.status === supportFilter;
    
    return matchesSearch && matchesStatus;
  });

  const onlineParticipants = participants.filter(p => p.is_online);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
                <p className="text-xs text-gray-500">System-wide oversight and control</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('super_admin_authenticated');
                  localStorage.removeItem('super_admin_login_time');
                  window.location.href = '/super-admin-login';
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'subscriptions', label: 'Subscriptions', icon: Crown },
              { id: 'support', label: 'Live Support', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === 'support' && chatSessions.filter(s => s.status === 'active' && !s.assigned_admin_id).length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {chatSessions.filter(s => s.status === 'active' && !s.assigned_admin_id).length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
            
            {/* System Stats */}
            {systemStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Building className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Restaurants</p>
                      <p className="text-2xl font-bold text-gray-900">{systemStats.totalRestaurants}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Customers</p>
                      <p className="text-2xl font-bold text-gray-900">{systemStats.totalCustomers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">{systemStats.totalTransactions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">${systemStats.totalRevenue.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Stats */}
            {subscriptionStats && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{subscriptionStats.total}</p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{subscriptionStats.active}</p>
                    <p className="text-sm text-gray-600">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{subscriptionStats.trial}</p>
                    <p className="text-sm text-gray-600">Trial</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{subscriptionStats.paid}</p>
                    <p className="text-sm text-gray-600">Paid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">${subscriptionStats.revenue.toFixed(0)}</p>
                    <p className="text-sm text-gray-600">Revenue</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  value={subscriptionSearch}
                  onChange={(e) => setSubscriptionSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Restaurant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions
                      .filter(sub => 
                        sub.user_email?.toLowerCase().includes(subscriptionSearch.toLowerCase()) ||
                        sub.restaurant_name?.toLowerCase().includes(subscriptionSearch.toLowerCase())
                      )
                      .map((subscription) => (
                        <tr key={subscription.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {subscription.restaurant_name || 'Unknown Restaurant'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {subscription.user_email || 'Unknown Email'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 capitalize">
                              {subscription.plan_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                              subscription.status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {subscription.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(subscription.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Live Support Chat</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={supportSearch}
                    onChange={(e) => setSupportSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={supportFilter}
                  onChange={(e) => setSupportFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
              {/* Chat Sessions List */}
              <div className="bg-white border border-gray-200 rounded-xl flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Active Chats</h3>
                  <p className="text-sm text-gray-500">
                    {filteredSessions.filter(s => s.status === 'active').length} active conversations
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredSessions.length === 0 ? (
                    <div className="p-4 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No chat sessions</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                            selectedSession?.id === session.id ? 'bg-red-50 border-r-2 border-red-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                                {session.title}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {session.restaurant?.name || 'Unknown Restaurant'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {session.unread_count && session.unread_count > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
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

                          {session.assigned_admin_name ? (
                            <div className="flex items-center gap-1 mt-2">
                              <UserCheck className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-600">{session.assigned_admin_name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 mt-2">
                              <UserX className="h-3 w-3 text-red-600" />
                              <span className="text-xs text-red-600">Unassigned</span>
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
                        <div>
                          <h3 className="font-semibold text-gray-900">{selectedSession.title}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600">
                              {selectedSession.restaurant?.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedSession.status)}`}>
                                {selectedSession.status}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(selectedSession.priority)}`}>
                                {selectedSession.priority}
                              </span>
                            </div>
                            
                            {/* Online Status */}
                            {onlineParticipants.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Circle className="h-2 w-2 text-green-500 fill-current" />
                                <span className="text-xs text-gray-500">
                                  {onlineParticipants.length} online
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {!selectedSession.assigned_admin_id && (
                          <button
                            onClick={() => {
                              setSessionToJoin(selectedSession);
                              setShowJoinModal(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            Join Chat
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_type === 'super_admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md ${
                            message.sender_type === 'super_admin'
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl rounded-br-md'
                              : message.is_system_message
                              ? 'bg-blue-100 text-blue-800 rounded-lg'
                              : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                          } px-4 py-3`}>
                            {!message.is_system_message && (
                              <p className={`text-xs mb-1 ${
                                message.sender_type === 'super_admin' ? 'text-white/70' : 'text-gray-500'
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
                              message.sender_type === 'super_admin' ? 'text-white/70' : 'text-gray-500'
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
                    {selectedSession.assigned_admin_id && (
                      <div className="p-4 border-t border-gray-200">
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
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
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
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Chat</h3>
                      <p className="text-gray-500">Choose a chat session to start helping customers</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Join Chat Modal */}
      {showJoinModal && sessionToJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Join Chat Session</h3>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSessionToJoin(null);
                  setAdminName('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">{sessionToJoin.title}</h4>
                <p className="text-sm text-gray-600">{sessionToJoin.restaurant?.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(sessionToJoin.priority)}`}>
                    {sessionToJoin.priority}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created {formatDate(sessionToJoin.created_at)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter your name (visible to customer)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This name will be visible to the customer during the chat
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSessionToJoin(null);
                  setAdminName('');
                }}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinChat}
                disabled={!adminName.trim()}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Join Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUI;