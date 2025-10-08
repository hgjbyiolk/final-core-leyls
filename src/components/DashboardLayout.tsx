import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Users, Gift, Settings, LogOut, Menu, X, ChefHat, MapPin, Headphones as HeadphonesIcon, Wallet, BarChart3, Crown, Clock, ArrowRight, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';

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
    if (user) {
      checkSubscription();
    }
  }, [user]);

  // Listen for subscription updates from payments
  React.useEffect(() => {
    const handleSubscriptionUpdate = () => {
      console.log('🔄 Subscription update event received, refreshing...');
      checkSubscription(true);
      setShowUpgradeSuccess(true);
      setTimeout(() => setShowUpgradeSuccess(false), 5000);
    };

    window.addEventListener('subscription-updated', handleSubscriptionUpdate);
    return () => window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
  }, []);

  // Check for payment success in URL and refresh subscription
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      console.log('🎉 Payment success detected, refreshing subscription...');
      
      // Clean up URL immediately to prevent re-triggering
      window.history.replaceState({}, '', window.location.pathname);
      
      // Trigger immediate subscription refresh and set up polling
      checkSubscription(true);
      
      // Set up polling to check for subscription updates
      let pollCount = 0;
      const maxPolls = 20; // Poll for up to 2 minutes
      const pollInterval = setInterval(() => {
        pollCount++;
        console.log(`🔄 Polling for subscription update (${pollCount}/${maxPolls})`);
        checkSubscription(true);
        
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          console.log('⏰ Stopped polling for subscription updates');
        }
      }, 6000); // Poll every 6 seconds
      
      // Also trigger the subscription update event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('subscription-updated'));
      }, 1000);
      
      // Clean up polling when component unmounts
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, []);

  const checkSubscription = async (forceRefresh: boolean = false) => {
    if (!user) return;

    // Check if we should use cached subscription data (15 minute cache)
    const now = Date.now();
    const SUBSCRIPTION_CACHE_DURATION = 5 * 1000; // Reduced to 5 seconds for immediate payment updates
    
    if (!forceRefresh && subscriptionData && (now - lastSubscriptionCheck) < SUBSCRIPTION_CACHE_DURATION) {
      console.log('📊 Using cached subscription data');
      return;
    }

    try {
      setSubscriptionLoading(true);
      console.log('🔄 Fetching fresh subscription data...', forceRefresh ? '(forced)' : '(cache expired)');
      
      // Import SubscriptionService dynamically to avoid import issues
      const { SubscriptionService } = await import('../services/subscriptionService');
      const data = await SubscriptionService.checkSubscriptionAccess(user.id);
      
      console.log('📊 Subscription data loaded:', {
        hasAccess: data.hasAccess,
        planType: data.subscription?.plan_type,
        status: data.subscription?.status,
        daysRemaining: data.daysRemaining,
        billingPeriodText: data.billingPeriodText,
        billingPeriodAccurate: data.billingPeriodAccurate
      });
      
      setSubscriptionData(data);
      setLastSubscriptionCheck(now);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Loyalty Program', href: '/loyalty', icon: Gift },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Locations', href: '/locations', icon: MapPin },
    { name: 'Support', href: '/support', icon: HeadphonesIcon },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href) => {
    return location.pathname === href;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`relative z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2 ring-1 ring-white/10">
              <div className="flex h-16 shrink-0 items-center">
                <img src="/leyls-svg.svg" alt="Leyls" className="h-8 w-auto" />
              </div>
              <nav className="flex flex-1 flex-col">
                <ul className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul className="-mx-2 space-y-1">
                      {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.name}>
                            <button
                              onClick={() => {
                                navigate(item.href);
                                setSidebarOpen(false);
                              }}
                              className={`group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 w-full text-left ${
                                isActive(item.href)
                                  ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white'
                                  : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                              }`}
                            >
                              <Icon className="h-6 w-6 shrink-0" />
                              {item.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm rounded-r-3xl m-2 mr-0">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100 rounded-tr-3xl">
            <div className="flex items-center space-x-3">
              {sidebarCollapsed ? (
                <img src={SwooshLogo} alt="Leyls" className="h-12 w-12 object-contain" />
              ) : (
                <img src="/leyls-svg.svg" alt="Leyls" className="h-10 w-auto object-contain" />
              )}
            </div>
            
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name}>
                  {sidebarCollapsed ? (
                    <div className="relative group">
                      <button
                        onClick={() => navigate(item.href)}
                        className={`w-full flex items-center justify-center px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors ${
                          isActive(item.href) ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white shadow-lg' : ''
                        }`}
                      >
                        <Icon className="w-7 h-7" />
                      </button>
                      <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                        {item.name}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(item.href)}
                      className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive(item.href) ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-6 h-6 mr-3" />
                      {item.name}
                    </button>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Bottom section with subscription info and user profile */}
          <div className="p-4 space-y-4 border-t border-gray-100">
            {/* Subscription Status */}
            {subscriptionData?.subscription?.plan_type === 'trial' && !sidebarCollapsed && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Trial Period</span>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                    {subscriptionData.daysRemaining}d left
                  </span>
                </div>
                
                {subscriptionData.daysRemaining <= 7 && (
                  <div className="mb-3">
                    <button
                      onClick={() => navigate('/upgrade')}
                      className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-md transition-all duration-200"
                    >
                      <Crown className="w-4 h-4" />
                      <span>Upgrade Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-3">
                  {/* Current Plan */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Current Plan</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      subscriptionData.subscription?.plan_type === 'trial'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {subscriptionData.subscription?.plan_type || 'Trial'}
                    </span>
                  </div>

                  {/* Status */}
                  {subscriptionData.subscription?.status && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-600">Status</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        subscriptionData.subscription.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : subscriptionData.subscription.status === 'past_due'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {subscriptionData.subscription.status}
                      </span>
                    </div>
                  )}

                  {/* Billing Period */}
                  {subscriptionData.billingPeriodText && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-600">Billing Period</span>
                      <span className="text-xs font-medium text-gray-900">
                        {subscriptionData.billingPeriodText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Profile Section */}
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
              {sidebarCollapsed ? (
                <div className="relative group">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {user?.email}
                  <img src="/swoosh-logo.svg" alt="Leyls" className="h-12 w-12 object-contain" />
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-500">Restaurant Owner</p>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {sidebarCollapsed ? (
              <div className="space-y-2">
                <div className="relative group">
                  <button
                    onClick={() => navigate('/wallet')}
                    className="w-full flex items-center justify-center px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <Wallet className="w-7 h-7" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    Customer Wallet
                  </div>
                </div>
                
                {subscriptionData?.subscription?.plan_type === 'trial' && (
                  <div className="relative group">
                    <button
                      onClick={() => navigate('/upgrade')}
                      className="w-full flex items-center justify-center px-3 py-3 text-white bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] rounded-xl transition-colors hover:shadow-md"
                    >
                      <Crown className="w-7 h-7" />
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Upgrade Plan
                    </div>
                  </div>
                )}
                
                <div className="relative group">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center px-3 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-7 h-7" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    Sign Out
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/wallet')}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Wallet className="w-6 h-6 mr-3" />
                  Customer Wallet
                </button>

                {subscriptionData?.subscription?.plan_type === 'trial' && (
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="w-full flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] rounded-xl transition-colors hover:shadow-md"
                  >
                    <Crown className="w-6 h-6 mr-3" />
                    Upgrade Plan
                  </button>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-6 h-6 mr-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Subscription indicator for mobile */}
              {subscriptionData?.subscription?.plan_type === 'trial' && 
               subscriptionData?.daysRemaining !== undefined && 
               subscriptionData?.daysRemaining <= 7 && (
                <button
                  onClick={() => navigate('/upgrade')}
                  className="lg:hidden bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  {subscriptionData.daysRemaining}d left
                </button>
              )}

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500">Restaurant Owner</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
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