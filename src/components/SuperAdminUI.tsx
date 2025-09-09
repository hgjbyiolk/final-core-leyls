import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building, DollarSign, TrendingUp, BarChart3, 
  MessageSquare, Settings, LogOut, RefreshCw, Search,
  Filter, Eye, MoreVertical, Crown, AlertCircle, CheckCircle,
  Clock, Star, ArrowRight, Send, X, Loader2, Plus,
  FileText, Download, Upload, Paperclip, Image, File,
  User, Shield, Zap, Target, Gift, Calendar, Phone, Mail
} from 'lucide-react';
import { SupportService, SupportTicket, SupportMessage } from '../services/supportService';
import { SubscriptionService } from '../services/subscriptionService';

const SuperAdminUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'support' | 'subscriptions' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Support state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [adminName, setAdminName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [ticketToJoin, setTicketToJoin] = useState<SupportTicket | null>(null);
  
  // Subscription refs for cleanup
  const ticketSubscriptionRef = useRef<any>(null);
  const messageSubscriptionRef = useRef<any>(null);
  const allMessagesSubscriptionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stats state
  const [systemStats, setSystemStats] = useState<any>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<any>(null);
  const [ticketStats, setTicketStats] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated as super admin
    const isAuthenticated = localStorage.getItem('super_admin_authenticated');
    const loginTime = localStorage.getItem('super_admin_login_time');
    
    if (!isAuthenticated || !loginTime) {
      navigate('/super-admin-login');
      return;
    }

    // Check if session is still valid (24 hours)
    const loginDate = new Date(loginTime);
    const now = new Date();
    const hoursSinceLogin = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLogin > 24) {
      localStorage.removeItem('super_admin_authenticated');
      localStorage.removeItem('super_admin_login_time');
      navigate('/super-admin-login');
      return;
    }

    loadDashboardData();
    setupGlobalSubscriptions();

    return () => {
      cleanupAllSubscriptions();
    };
  }, [navigate]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages();
      setupMessageSubscription();
    } else {
      cleanupMessageSubscription();
    }
  }, [selectedTicket]);

  const cleanupAllSubscriptions = () => {
    console.log('🧹 Cleaning up all super admin subscriptions');
    cleanupTicketSubscription();
    cleanupMessageSubscription();
    cleanupAllMessagesSubscription();
  };

  const cleanupTicketSubscription = () => {
    if (ticketSubscriptionRef.current) {
      console.log('🔌 Cleaning up ticket subscription');
      try {
        ticketSubscriptionRef.current.unsubscribe();
      } catch (err) {
        console.warn('⚠️ Error unsubscribing from tickets:', err);
      }
      ticketSubscriptionRef.current = null;
    }
  };

  const cleanupMessageSubscription = () => {
    if (messageSubscriptionRef.current) {
      console.log('🔌 Cleaning up message subscription');
      try {
        messageSubscriptionRef.current.unsubscribe();
      } catch (err) {
        console.warn('⚠️ Error unsubscribing from messages:', err);
      }
      messageSubscriptionRef.current = null;
    }
  };

  const cleanupAllMessagesSubscription = () => {
    if (allMessagesSubscriptionRef.current) {
      console.log('🔌 Cleaning up all messages subscription');
      try {
        allMessagesSubscriptionRef.current.unsubscribe();
      } catch (err) {
        console.warn('⚠️ Error unsubscribing from all messages:', err);
      }
      allMessagesSubscriptionRef.current = null;
    }
  };

  const setupGlobalSubscriptions = () => {
    console.log('🔌 Setting up global subscriptions for super admin');
    
    // Setup tickets subscription
    cleanupTicketSubscription();
    try {
      const ticketSub = SupportService.subscribeToTickets((payload) => {
        console.log('🎫 Global ticket update:', payload);
        
        if (payload.eventType === 'INSERT' && payload.new) {
          setTickets(prev => {
            const exists = prev.some(ticket => ticket.id === payload.new.id);
            if (exists) return prev;
            
            return [payload.new, ...prev].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setTickets(prev => prev.map(ticket => 
            ticket.id === payload.new.id ? payload.new : ticket
          ));
        }
      });
      
      ticketSubscriptionRef.current = ticketSub;
      console.log('✅ Global ticket subscription established');
    } catch (err) {
      console.error('❌ Failed to setup global ticket subscription:', err);
    }

    // Setup global messages subscription
    cleanupAllMessagesSubscription();
    try {
      const messagesSub = SupportService.subscribeToAllMessages((payload) => {
        console.log('📨 Global message update:', payload);
        
        // Update unread counts or show notifications for new messages
        if (payload.eventType === 'INSERT' && payload.new) {
          // If this message is for the currently selected ticket, update messages
          if (selectedTicket && payload.new.ticket_id === selectedTicket.id) {
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === payload.new.id);
              if (exists) return prev;
              
              const newMessages = [...prev, payload.new].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              // Auto-scroll to bottom
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              
              return newMessages;
            });
          }
        }
      });
      
      allMessagesSubscriptionRef.current = messagesSub;
      console.log('✅ Global messages subscription established');
    } catch (err) {
      console.error('❌ Failed to setup global messages subscription:', err);
    }
  };

  const setupMessageSubscription = () => {
    if (!selectedTicket) return;
    
    cleanupMessageSubscription();
    
    console.log('🔌 Setting up message subscription for ticket:', selectedTicket.id);
    
    try {
      const subscription = SupportService.subscribeToMessages(
        selectedTicket.id,
        (payload) => {
          console.log('📨 Real-time message update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === payload.new.id);
              if (exists) {
                console.log('📨 Message already exists, skipping');
                return prev;
              }
              
              console.log('📨 Adding new message:', payload.new);
              const newMessages = [...prev, payload.new].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              // Auto-scroll to bottom
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              
              return newMessages;
            });
          }
        }
      );
      
      messageSubscriptionRef.current = subscription;
      console.log('✅ Message subscription established');
    } catch (err) {
      console.error('❌ Failed to setup message subscription:', err);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading super admin dashboard data...');

      const [systemData, subscriptionData, ticketData, ticketsData] = await Promise.all([
        SubscriptionService.getSystemWideStats(),
        SubscriptionService.getSubscriptionStats(),
        SupportService.getTicketStats(),
        SupportService.getAllTickets()
      ]);

      setSystemStats(systemData);
      setSubscriptionStats(subscriptionData);
      setTicketStats(ticketData);
      setTickets(ticketsData);
      
      console.log('✅ Dashboard data loaded:', {
        systemStats: systemData,
        subscriptionStats: subscriptionData,
        ticketStats: ticketData,
        totalTickets: ticketsData.length
      });
    } catch (err: any) {
      console.error('❌ Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedTicket) return;
    
    try {
      console.log('📨 Fetching messages for ticket:', selectedTicket.id);
      const messagesData = await SupportService.getTicketMessages(selectedTicket.id);
      const sortedMessages = messagesData.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sortedMessages);
      console.log('✅ Messages loaded:', sortedMessages.length);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const handleJoinChat = (ticket: SupportTicket) => {
    setTicketToJoin(ticket);
    setShowNameModal(true);
  };

  const handleConfirmJoin = async () => {
    if (!ticketToJoin || !adminName.trim()) return;

    try {
      // Update ticket with admin assignment
      await SupportService.updateTicketStatus(
        ticketToJoin.id,
        'in_progress',
        adminName.trim()
      );

      // Select the ticket and close modal
      setSelectedTicket(ticketToJoin);
      setShowNameModal(false);
      setTicketToJoin(null);
      setAdminName('');
      
      // Refresh tickets to show updated assignment
      const updatedTickets = await SupportService.getAllTickets();
      setTickets(updatedTickets);
      
    } catch (error) {
      console.error('Error joining chat:', error);
      alert('Failed to join chat');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !adminName) {
      if (!adminName) {
        alert('Please set your admin name first');
        return;
      }
      return;
    }

    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    setSendingMessage(true);

    try {
      console.log('📤 Super admin sending message:', {
        ticketId: selectedTicket.id,
        message: messageToSend,
        adminName
      });
      
      await SupportService.sendMessage({
        ticket_id: selectedTicket.id,
        sender_type: 'super_admin',
        sender_id: adminName, // Use admin name as sender ID
        message: messageToSend
      });

      console.log('✅ Super admin message sent successfully');
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setNewMessage(messageToSend); // Restore message on error
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('super_admin_authenticated');
    localStorage.removeItem('super_admin_login_time');
    navigate('/super-admin-login');
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.restaurant?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-600">System-wide oversight and control</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={loadDashboardData}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4 space-y-2">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'support', label: 'Live Support', icon: MessageSquare },
              { id: 'subscriptions', label: 'Subscriptions', icon: Crown },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-100 text-red-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Building className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Restaurants</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {systemStats?.totalRestaurants || 0}
                      </p>
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
                      <p className="text-2xl font-bold text-gray-900">
                        {systemStats?.totalCustomers || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(systemStats?.totalRevenue || 0).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Support Tickets</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {ticketStats?.total || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Stats */}
              {subscriptionStats && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <p className="text-2xl font-bold text-blue-600">{subscriptionStats.active}</p>
                      <p className="text-sm text-blue-700">Active Subscriptions</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <p className="text-2xl font-bold text-green-600">{subscriptionStats.trial}</p>
                      <p className="text-sm text-green-700">Trial Users</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <p className="text-2xl font-bold text-purple-600">{subscriptionStats.paid}</p>
                      <p className="text-sm text-purple-700">Paid Subscriptions</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                      <p className="text-2xl font-bold text-yellow-600">${subscriptionStats.revenue.toFixed(0)}</p>
                      <p className="text-sm text-yellow-700">Monthly Revenue</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Live Support Center</h2>
                  <p className="text-gray-600">Manage customer support conversations</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    tickets.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {tickets.filter(t => t.status === 'open').length} active chats
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
                {/* Tickets Sidebar */}
                <div className="bg-white border border-gray-200 rounded-xl flex flex-col">
                  {/* Filters */}
                  <div className="p-4 border-b border-gray-200 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="all">All Priority</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  {/* Tickets List */}
                  <div className="flex-1 overflow-y-auto">
                    {supportLoading ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-gray-500">Loading tickets...</p>
                      </div>
                    ) : filteredTickets.length === 0 ? (
                      <div className="p-4 text-center">
                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No tickets found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                              selectedTicket?.id === ticket.id ? 'bg-red-50 border-r-2 border-red-500' : ''
                            }`}
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                                  {ticket.title}
                                </h3>
                                <p className="text-xs text-gray-600 mb-1">
                                  {ticket.restaurant?.name || 'Unknown Restaurant'}
                                </p>
                                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                  {ticket.description}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                                  {ticket.status.replace('_', ' ')}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                                  {ticket.priority}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatDate(ticket.created_at)}
                              </span>
                              {ticket.assigned_to_admin && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                  {ticket.assigned_to_admin}
                                </span>
                              )}
                              {!ticket.assigned_to_admin && ticket.status === 'open' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleJoinChat(ticket);
                                  }}
                                  className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                                >
                                  Join Chat
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Area */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl flex flex-col">
                  {selectedTicket ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="font-semibold text-gray-900">{selectedTicket.title}</h2>
                            <p className="text-sm text-gray-600">{selectedTicket.restaurant?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                                {selectedTicket.status.replace('_', ' ')}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                                {selectedTicket.priority}
                              </span>
                              <span className="text-xs text-gray-500">
                                Created {formatDate(selectedTicket.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedTicket.assigned_to_admin && (
                              <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                Assigned to: {selectedTicket.assigned_to_admin}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setSelectedTicket(null);
                                cleanupMessageSubscription();
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Ticket Description */}
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700">{selectedTicket.description}</p>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_type === 'super_admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                              message.sender_type === 'super_admin'
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              <p className="text-sm leading-relaxed">{message.message}</p>
                              <div className="flex items-center justify-between mt-2">
                                <p className={`text-xs ${
                                  message.sender_type === 'super_admin' ? 'text-white/70' : 'text-gray-500'
                                }`}>
                                  {message.sender_type === 'super_admin' ? message.sender_id : 'Customer'}
                                </p>
                                <p className={`text-xs ${
                                  message.sender_type === 'super_admin' ? 'text-white/70' : 'text-gray-500'
                                }`}>
                                  {formatDate(message.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Input */}
                      <div className="p-4 border-t border-gray-200">
                        {!selectedTicket.assigned_to_admin ? (
                          <div className="text-center py-4">
                            <button
                              onClick={() => handleJoinChat(selectedTicket)}
                              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
                            >
                              <MessageSquare className="h-4 w-4" />
                              Join This Chat
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
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
                              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              disabled={sendingMessage}
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={sendingMessage || !newMessage.trim()}
                              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Support Ticket</h3>
                        <p className="text-gray-500">Choose a ticket to view the conversation</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <p className="text-gray-600">Subscription management features coming soon...</p>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <p className="text-gray-600">Advanced analytics features coming soon...</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Admin Name Modal */}
      {showNameModal && ticketToJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Join Support Chat</h3>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setTicketToJoin(null);
                  setAdminName('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 mb-2">Ticket Details</h4>
                <p className="text-blue-800 font-medium">{ticketToJoin.title}</p>
                <p className="text-blue-700 text-sm">{ticketToJoin.restaurant?.name}</p>
                <p className="text-blue-600 text-sm mt-1">{ticketToJoin.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name (visible to customer)
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  setShowNameModal(false);
                  setTicketToJoin(null);
                  setAdminName('');
                }}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoin}
                disabled={!adminName.trim()}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

export default SuperAdminUI;