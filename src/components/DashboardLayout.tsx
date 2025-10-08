import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, Users, Gift, Settings, LogOut, Menu, X, ChefHat, MapPin, 
  Headphones as HeadphonesIcon, Wallet, BarChart3, Crown, Clock, 
  CreditCard, ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [lastSubscriptionCheck, setLastSubscriptionCheck] = useState<number>(0);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  React.useEffect(() => {
    if (user) checkSubscription();
  }, [user]);

  React.useEffect(() => {
    const handleSubscriptionUpdate = () => {
      checkSubscription(true);
      setShowUpgradeSuccess(true);
      setTimeout(() => setShowUpgradeSuccess(false), 5000);
    };
    window.addEventListener('subscription-updated', handleSubscriptionUpdate);
    return () => window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
  }, []);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      checkSubscription(true);
      let pollCount = 0;
      const maxPolls = 20;
      const pollInterval = setInterval(() => {
        pollCount++;
        checkSubscription(true);
        if (pollCount >= maxPolls) clearInterval(pollInterval);
      }, 6000);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('subscription-updated'));
      }, 1000);
      return () => clearInterval(pollInterval);
    }
  }, []);

  const checkSubscription = async (forceRefresh: boolean = false) => {
    if (!user) return;
    const now = Date.now();
    const CACHE_DURATION = 5000;
    if (!forceRefresh && subscriptionData && (now - lastSubscriptionCheck) < CACHE_DURATION) {
      return;
    }
    try {
      setSubscriptionLoading(true);
      const data = await SubscriptionService.checkSubscriptionAccess(user.id);
      setSubscriptionData(data);
      setLastSubscriptionCheck(now);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Menu Items', href: '/dashboard/menu-items', icon: ChefHat },
    { name: 'Rewards', href: '/dashboard/rewards', icon: Gift },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Branches', href: '/dashboard/branches', icon: MapPin },
    { name: 'Loyalty Config', href: '/dashboard/loyalty-config', icon: Settings },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Support', href: '/dashboard/support', icon: HeadphonesIcon },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl rounded-r-3xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 rounded-tr-3xl">
            <img src="/leyls-svg.svg" alt="Leyls" className="h-8 w-auto object-contain" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => { navigate(item.href); setSidebarOpen(false); }}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-6 h-6 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
            >
              <LogOut className="w-6 h-6 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
      }`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm rounded-r-3xl m-2 mr-0">
          <div className={`flex h-16 items-center border-b border-gray-100 rounded-tr-3xl relative ${
            sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}>
            {sidebarCollapsed ? (
              <img src="/SwooshLogo.svg" alt="Swoosh Logo" className="h-10 w-10 object-contain" />
            ) : (
              <>
                <img src="/leyls-svg.svg" alt="Leyls" className="h-10 w-auto object-contain" />
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl ml-auto"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}
            {sidebarCollapsed && (
              <div className="absolute -right-3 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-full shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <nav className="flex-1 px-2 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="relative group">
                  <button
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
                    } text-sm font-medium rounded-xl transition-all ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    {!sidebarCollapsed && <span className="ml-3">{item.name}</span>}
                  </button>
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap shadow-lg">
                      {item.name}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl`}
            >
              <LogOut className="w-6 h-6" />
              {!sidebarCollapsed && <span className="ml-3">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-64'}`}>
        <div className="sticky top-0 z-40 flex h-16 items-center border-b border-gray-200 bg-white px-4 shadow-sm">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden hover:bg-gray-100 rounded-xl"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-end items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">Restaurant Owner</p>
              </div>
            </div>
          </div>
        </div>
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
