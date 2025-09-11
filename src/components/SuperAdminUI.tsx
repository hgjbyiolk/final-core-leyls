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

  // Stats state
  const [systemStats, setSystemStats] = useState<any>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<any>(null);

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

    return () => {
      // Cleanup any subscriptions if needed
    };
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading super admin dashboard data...');

      const [systemData, subscriptionData] = await Promise.all([
        SubscriptionService.getSystemWideStats(),
        SubscriptionService.getSubscriptionStats()
      ]);

      setSystemStats(systemData);
      setSubscriptionStats(subscriptionData);
      
      console.log('✅ Dashboard data loaded:', {
        systemStats: systemData,
        subscriptionStats: subscriptionData
      });
    } catch (err: any) {
      console.error('❌ Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('super_admin_authenticated');
    localStorage.removeItem('super_admin_login_time');
    navigate('/super-admin-login');
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
              { id: 'subscriptions', label: 'Subscriptions', icon: Crown },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'support', label: 'Support Portal', icon: MessageSquare, external: true }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.external) {
                      window.open('/support-portal', '_blank');
                    } else {
                      setActiveTab(tab.id as any);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id && !tab.external
                      ? 'bg-red-100 text-red-700 font-medium'
                      : tab.external
                      ? 'text-blue-600 hover:bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                  {tab.external && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      External
                    </span>
                  )}
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
                      <Building className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Restaurants</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {systemStats?.activeRestaurants || 0}
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

          {/* Support Portal Link */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Support Portal</h3>
                <p className="text-blue-700 text-sm">Access the dedicated support chat system</p>
              </div>
              <button
                onClick={() => window.open('/support-portal', '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Open Portal
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminUI;