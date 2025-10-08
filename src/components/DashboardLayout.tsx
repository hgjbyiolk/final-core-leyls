import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, Users, Gift, Settings, LogOut, Menu, X, ChefHat, MapPin, 
  Headphones as HeadphonesIcon, Wallet, BarChart3, Crown, Clock, 
  ArrowRight, CreditCard, ChevronLeft, ChevronRight 
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
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === href;
  };

  // Add debug info for subscription status
  React.useEffect(() => {
    if (subscriptionData) {
      console.log('🔍 Current subscription status in layout:', {
        planType: subscriptionData.subscription?.plan_type,
        status: subscriptionData.subscription?.status,
        hasAccess: subscriptionData.hasAccess,
        isExpired: subscriptionData.isExpired,
        daysRemaining: subscriptionData.daysRemaining
      });
    }
  }, [subscriptionData]);

  const SwooshLogo = () => (
    <svg 
      className="w-10 h-10" 
      viewBox="250 700 1500 700" 
      preserveAspectRatio="xMidYMid meet"
      fill="white"
    >
      <defs>
        <linearGradient id="Gradient1" gradientUnits="userSpaceOnUse" x1="385.404" y1="976.949" x2="625.975" y2="952.048">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <filter id="MultiGradient">
          <feMerge>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(-150, 0) scale(1.1,1)">
        <path fill="white" filter="url(#MultiGradient)" d="M 448.064 1064.01 C 448.355 1064.2 448.644 1064.4 448.938 1064.59 C 491.567 1092.51 734.298 997.706 750.364 1064.59 C 753.776 1078.79 745.521 1093.5 737.967 1104.97 C 724.47 1125.47 674.133 1180.01 648.91 1184.91 C 643.623 1185.94 638.938 1185.11 634.541 1181.94 C 630.686 1179.16 628.307 1175.35 627.713 1170.62 C 625.604 1153.84 655.402 1122.78 639.778 1109.89 C 629.802 1101.66 609.924 1104.33 598.071 1105.95 C 563.443 1110.7 514.941 1122.64 480.452 1118.06 C 469.097 1112.92 440.506 1120.36 447.167 1097.47 C 449.864 1088.2 444.698 1069.66 446.402 1064.37 L 448.064 1064.01 M 608.9 805.465 C 654.88 779.725 744.556 738.358 797.091 749.236 C 858.04 761.856 810.325 876.049 779.055 897.999 C 764.609 908.139 748.298 890.903 744.535 876.43 C 749.113 857.841 754.24 844.406 757.737 824.991 C 727.452 830.953 692.769 848.186 663.174 858.242 C 653.337 861.584 640.994 869.014 631.466 871.815 L 620.692 876.649 C 617.683 874.03 618.86 875.652 617.497 872.011 L 616.013 868.05 C 612.844 859.559 607.279 827.044 604.714 815.738 C 602.097 813.361 601.941 813.009 600.896 809.847 C 601.941 813.009 602.097 813.361 604.714 815.738 C 607.279 827.044 612.844 859.559 616.013 868.05 L 617.497 872.011 C 618.86 875.652 617.683 874.03 620.692 876.649 C 557.119 905.454 477.081 952.912 449.812 1020.7 C 444.351 1034.28 441.123 1050.41 448.064 1064.01 L 446.402 1064.37 C 444.698 1069.66 449.864 1088.2 447.167 1097.47 C 440.506 1120.36 469.097 1112.92 480.452 1118.06 C 373.899 1118.81 374.34 1035.36 420.099 961.666 C 462.53 893.33 531.037 847.011 600.896 809.847 z"/>
      </g>
      <g transform="translate(-75, 22)">
        <path fill="white" d="M 559.979 1188.3 C 572.005 1187.1 585.592 1187.7 596.602 1193.11 C 604.638 1196.99 610.738 1203.99 613.49 1212.49 C 622.265 1239.06 605.03 1265.05 579.42 1273.31 C 548.231 1280.07 520.898 1260.17 525.065 1227.49 C 527.974 1204.66 537.172 1191.88 559.979 1188.3 z"/>
      </g>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl rounded-r-3xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 rounded-tr-3xl">
            <div className="flex items-center space-x-3">
              <img src="/leyls-svg.svg" alt="Leyls" className="h-7 w-auto object-contain" />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
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
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-gray-200 rounded-br-3xl">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
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
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100 rounded-tr-3xl">
            <div className="flex items-center space-x-3">
              {sidebarCollapsed ? (
                <div className="w-10 h-10 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-2xl flex items-center justify-center p-1">
                  <SwooshLogo />
                </div>
              ) : (
                <img src="/leyls-svg.svg" alt="Leyls" className="h-10 w-auto object-contain" />
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="relative group">
                  <button
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5'} text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'}`} />
                    {!sidebarCollapsed && item.name}
                  </button>
                  
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {item.name}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-gray-200 rounded-br-3xl">
            {/* Subscription Status */}
            {subscriptionData && !sidebarCollapsed && (
              <div className="mb-4">
                {subscriptionData.subscription?.plan_type === 'trial' && 
                 subscriptionData.daysRemaining !== undefined && 
                 subscriptionData.daysRemaining <= 7 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">
                        Trial expires in {subscriptionData.daysRemaining} days
                      </span>
                    </div>
                    <button
                      onClick={() => navigate('/upgrade')}
                      className="w-full bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] text-white px-3 py-2 rounded-xl text-sm font-medium hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      Upgrade Now
                    </button>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-3 mb-3">
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

            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} mb-4`}>
              <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center`}>
                <span className="text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500">Restaurant Owner</p>
                </div>
              )}
              <div className="relative group">
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  title="Sign Out"
                >
                  <LogOut className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
                </button>
                
                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    Sign Out
                  </div>
                )}
              </div>
            </div>

            {!sidebarCollapsed && (
              <>
                <button
                  onClick={() => navigate('/wallet')}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors mb-2"
                >
                  <Wallet className="w-5 h-5 mr-3" />
                  Customer Wallet
                </button>

                {subscriptionData?.subscription?.plan_type === 'trial' && (
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="w-full flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] rounded-xl transition-colors mb-2 hover:shadow-md"
                  >
                    <Crown className="w-5 h-5 mr-3" />
                    Upgrade Plan
                  </button>
                )}

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </button>
              </>
            )}

            {/* Collapsed state action buttons */}
            {sidebarCollapsed && (
              <div className="space-y-2">
                <div className="relative group">
                  <button
                    onClick={() => navigate('/wallet')}
                    className="w-full flex items-center justify-center px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <Wallet className="w-6 h-6" />
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
                      <Crown className="w-6 h-6" />
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Upgrade Plan
                    </div>
                  </div>
                )}
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
}