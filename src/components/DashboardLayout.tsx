@@ .. @@
 import React, { useState } from 'react';
 import { useNavigate, useLocation, Outlet } from 'react-router-dom';
 import { SubscriptionService } from '../services/subscriptionService';
 import { useAuth } from '../contexts/AuthContext';
-import { Home, Users, Gift, Settings, LogOut, Menu, X, ChefHat, MapPin, Headphones as HeadphonesIcon, Wallet, BarChart3, Crown, Clock, ArrowRight, CreditCard } from 'lucide-react';
+import { Home, Users, Gift, Settings, LogOut, Menu, X, ChefHat, MapPin, Headphones as HeadphonesIcon, Wallet, BarChart3, Crown, Clock, ArrowRight, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';

 export default function DashboardLayout() {
   const [sidebarOpen, setSidebarOpen] = useState(false);
+  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
   const [subscriptionData, setSubscriptionData] = useState<any>(null);
@@ .. @@
     {/* Mobile sidebar */}
-    <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
+    <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
       <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
-      <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
-        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
+      <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl rounded-r-2xl">
+        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 rounded-tr-2xl">
           <div className="flex items-center space-x-3">
             <img src="/leyls-svg.svg" alt="Leyls" className="h-7 w-auto object-contain" />
           </div>
@@ .. @@
     </div>

     {/* Desktop sidebar */}
-    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
-      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
-        <div className="flex h-16 items-center px-4 border-b border-gray-100">
+    <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
+      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm rounded-r-2xl m-2 mr-0">
+        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100 rounded-tr-2xl">
           <div className="flex items-center space-x-3">
-            <img src="/leyls-svg.svg" alt="Leyls" className="h-10 w-auto object-contain" />
+            {!sidebarCollapsed && (
+              <img src="/leyls-svg.svg" alt="Leyls" className="h-10 w-auto object-contain" />
+            )}
+            {sidebarCollapsed && (
+              <div className="w-8 h-8 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-lg flex items-center justify-center">
+                <span className="text-white text-sm font-bold">L</span>
+              </div>
+            )}
+          </div>
+          <button
+            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
+            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
+          >
+            {sidebarCollapsed ? (
+              <ChevronRight className="w-4 h-4" />
+            ) : (
+              <ChevronLeft className="w-4 h-4" />
+            )}
+          </button>
+        </div>
+        
+        <nav className="flex-1 px-4 py-4 space-y-2">
+          {navigation.map((item) => {
+            const Icon = item.icon;
+            return (
+              <button
+                key={item.name}
+                onClick={() => navigate(item.href)}
+                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative ${
+                  isActive(item.href)
+                    ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white shadow-lg'
+                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
+                }`}
+                title={sidebarCollapsed ? item.name : undefined}
+              >
+                <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
+                {!sidebarCollapsed && item.name}
+                
+                {/* Tooltip for collapsed state */}
+                {sidebarCollapsed && (
+                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
+                    {item.name}
+                  </div>
+                )}
+              </button>
+            );
+          })}
+        </nav>
+        
+        <div className="p-4 border-t border-gray-200 rounded-br-2xl">
+          {/* Subscription Status */}
+          {subscriptionData && !sidebarCollapsed && (
+            <div className="mb-4">
+              {subscriptionData.subscription?.plan_type === 'trial' && subscriptionData.daysRemaining !== undefined && subscriptionData.daysRemaining <= 7 && (
+                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
+                  <div className="flex items-center gap-2 mb-2">
+                    <Clock className="h-4 w-4 text-yellow-600" />
+                    <span className="text-sm font-medium text-yellow-900">
+                      Trial expires in {subscriptionData.daysRemaining} days
+                    </span>
+                  </div>
+                  <button
+                    onClick={() => navigate('/upgrade')}
+                    className="w-full bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] text-white px-3 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
+                  >
+                    <Crown className="h-4 w-4" />
+                    Upgrade Now
+                  </button>
+                </div>
+              )}
+              
+              <div className="bg-gray-50 rounded-lg p-3 mb-3">
+                {/* Current Plan */}
+                <div className="flex items-center justify-between">
+                  <span className="text-xs text-gray-600">Current Plan</span>
+                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
+                    subscriptionData.subscription?.plan_type === 'trial' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
+                  }`}>
+                    {subscriptionData.subscription?.plan_type || 'Trial'}
+                  </span>
+                </div>
+                
+                {/* Status */}
+                {subscriptionData.subscription?.status && (
+                  <div className="flex items-center justify-between mt-1">
+                    <span className="text-xs text-gray-600">Status</span>
+                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
+                      subscriptionData.subscription.status === 'active' ? 'bg-green-100 text-green-800' :
+                      subscriptionData.subscription.status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
+                      'bg-red-100 text-red-800'
+                    }`}>
+                      {subscriptionData.subscription.status}
+                    </span>
+                  </div>
+                )}
+                
+                {/* Billing Period */}
+                {subscriptionData.billingPeriodText && (
+                  <div className="flex items-center justify-between mt-1">
+                    <span className="text-xs text-gray-600">Billing Period</span>
+                    <span className="text-xs font-medium text-gray-900">
+                      {subscriptionData.billingPeriodText}
+                    </span>
+                  </div>
+                )}
+              </div>
+            </div>
+          )}
+          
+          {/* Collapsed state subscription indicator */}
+          {subscriptionData && sidebarCollapsed && subscriptionData.subscription?.plan_type === 'trial' && subscriptionData.daysRemaining !== undefined && subscriptionData.daysRemaining <= 7 && (
+            <div className="mb-4 flex justify-center">
+              <button
+                onClick={() => navigate('/upgrade')}
+                className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors group relative"
+                title="Trial expires soon"
+              >
+                <Clock className="h-4 w-4" />
+                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
+                  Trial expires in {subscriptionData.daysRemaining} days
+                </div>
+              </button>
+            </div>
+          )}
+          
+          {/* User info */}
+          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} mb-4`}>
+            <div className="w-8 h-8 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center">
+              <span className="text-white text-sm font-medium">
+                {user?.email?.charAt(0).toUpperCase()}
+              </span>
+            </div>
+            {!sidebarCollapsed && (
+              <>
+                <div className="flex-1 min-w-0">
+                  <p className="text-sm font-medium text-gray-900 truncate">
+                    {user?.email}
+                  </p>
+                  <p className="text-xs text-gray-500">Restaurant Owner</p>
+                </div>
+                <button
+                  onClick={handleSignOut}
+                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
+                  title="Sign Out"
+                >
+                  <LogOut className="h-4 w-4" />
+                </button>
+              </>
+            )}
+          </div>
+          
+          {/* Action buttons */}
+          {!sidebarCollapsed && (
+            <>
+              <button
+                onClick={() => navigate('/wallet')}
+                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
+              >
+                <Wallet className="w-5 h-5 mr-3" />
+                Customer Wallet
+              </button>
+              
+              {subscriptionData?.subscription?.plan_type === 'trial' && (
+                <button
+                  onClick={() => navigate('/upgrade')}
+                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] rounded-lg transition-colors mb-2 hover:shadow-md"
+                >
+                  <Crown className="w-5 h-5 mr-3" />
+                  Upgrade Plan
+                </button>
+              )}
+              
+              <button
+                onClick={handleSignOut}
+                className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
+              >
+                <LogOut className="w-5 h-5 mr-3" />
+                Sign Out
+              </button>
+            </>
+          )}
+          
+          {/* Collapsed state action buttons */}
+          {sidebarCollapsed && (
+            <div className="space-y-2 flex flex-col items-center">
+              <button
+                onClick={() => navigate('/wallet')}
+                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors group relative"
+                title="Customer Wallet"
+              >
+                <Wallet className="w-5 h-5" />
+                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
+                  Customer Wallet
+                </div>
+              </button>
+              
+              {subscriptionData?.subscription?.plan_type === 'trial' && (
+                <button
+                  onClick={() => navigate('/upgrade')}
+                  className="p-2 text-white bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] rounded-lg transition-colors hover:shadow-md group relative"
+                  title="Upgrade Plan"
+                >
+                  <Crown className="w-5 h-5" />
+                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
+                    Upgrade Plan
+                  </div>
+                </button>
+              )}
+              
+              <button
+                onClick={handleSignOut}
+                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
+                title="Sign Out"
+              >
+                <LogOut className="w-5 h-5" />
+                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
+                  Sign Out
+                </div>
+              </button>
+            </div>
+          )}
+        </div>
+      </div>
+    </div>
+
+    {/* Main content */}
+    <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
+      {/* Top bar */}
+      <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
+        <button
+          type="button"
+          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
+          onClick={() => setSidebarOpen(true)}
+        >
+          <Menu className="h-6 w-6" />
+        </button>
+        
+        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
+          <div className="flex flex-1"></div>
+          <div className="flex items-center gap-x-4 lg:gap-x-6">
+            {/* Subscription indicator for mobile */}
+            {subscriptionData?.subscription?.plan_type === 'trial' && subscriptionData?.daysRemaining !== undefined && subscriptionData?.daysRemaining <= 7 && (
+              <button
+                onClick={() => navigate('/upgrade')}
+                className="lg:hidden bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
+              >
+                <Clock className="h-3 w-3" />
+                {subscriptionData.daysRemaining}d left
+              </button>
+            )}
+            
+            <div className="flex items-center space-x-3">
+              <div className="w-8 h-8 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center">
+                <span className="text-white text-sm font-medium">
+                  {user?.email?.charAt(0).toUpperCase()}
+                </span>
+              </div>
+              <div className="hidden md:block">
+                <p className="text-sm font-medium text-gray-900">
+                  {user?.email}
+                </p>
+                <p className="text-xs text-gray-500">Restaurant Owner</p>
+              </div>
+            </div>
           </div>
         </div>
-        <nav className="flex-1 px-4 py-4 space-y-2">
-          {navigation.map((item) => {
-            const Icon = item.icon;
-            return (
-              <button
-                key={item.name}
-                onClick={() => navigate(item.href)}
-                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
-                  isActive(item.href)
-                    ? 'bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white shadow-lg'
-                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
-                }`}
-              >
-                <Icon className="w-5 h-5 mr-3" />
-                {item.name}
-              </button>
-            );
-          })}
-        </nav>
-        <div className="p-4 border-t border-gray-200">
-          {/* Subscription Status */}
-          {subscriptionData && (
-            <div className="mb-4">
-              {subscriptionData.subscription?.plan_type === 'trial' && subscriptionData.daysRemaining !== undefined && subscriptionData.daysRemaining <= 7 && (
-                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
-                  <div className="flex items-center gap-2 mb-2">
-                    <Clock className="h-4 w-4 text-yellow-600" />
-                    <span className="text-sm font-medium text-yellow-900">
-                      Trial expires in {subscriptionData.daysRemaining} days
-                    </span>
-                  </div>
-                  <button
-                    onClick={() => navigate('/upgrade')}
-                    className="w-full bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] text-white px-3 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
-                  >
-                    <Crown className="h-4 w-4" />
-                    Upgrade Now
-                  </button>
-                </div>
-              )}
-              <div className="bg-gray-50 rounded-lg p-3 mb-3">
-                {/* Current Plan */}
-                <div className="flex items-center justify-between">
-                  <span className="text-xs text-gray-600">Current Plan</span>
-                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
-                    subscriptionData.subscription?.plan_type === 'trial' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
-                  }`}>
-                    {subscriptionData.subscription?.plan_type || 'Trial'}
-                  </span>
-                </div>
-                {/* Status */}
-                {subscriptionData.subscription?.status && (
-                  <div className="flex items-center justify-between mt-1">
-                    <span className="text-xs text-gray-600">Status</span>
-                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
-                      subscriptionData.subscription.status === 'active' ? 'bg-green-100 text-green-800' :
-                      subscriptionData.subscription.status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
-                      'bg-red-100 text-red-800'
-                    }`}>
-                      {subscriptionData.subscription.status}
-                    </span>
-                  </div>
-                )}
-                {/* Billing Period (NEW) */}
-                {subscriptionData.billingPeriodText && (
-                  <div className="flex items-center justify-between mt-1">
-                    <span className="text-xs text-gray-600">Billing Period</span>
-                    <span className="text-xs font-medium text-gray-900">
-                      {subscriptionData.billingPeriodText}
-                    </span>
-                  </div>
-                )}
-              </div>
-            </div>
-          )}
-          <div className="flex items-center space-x-3 mb-4">
-            <div className="w-8 h-8 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center">
-              <span className="text-white text-sm font-medium">
-                {user?.email?.charAt(0).toUpperCase()}
-              </span>
-            </div>
-            <div className="flex-1 min-w-0">
-              <p className="text-sm font-medium text-gray-900 truncate">
-                {user?.email}
-              </p>
-              <p className="text-xs text-gray-500">Restaurant Owner</p>
-            </div>
-            <button
-              onClick={handleSignOut}
-              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
-              title="Sign Out"
-            >
-              <LogOut className="h-4 w-4" />
-            </button>
-          </div>
-          <button
-            onClick={() => navigate('/wallet')}
-            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
-          >
-            <Wallet className="w-5 h-5 mr-3" />
-            Customer Wallet
-          </button>
-          {subscriptionData?.subscription?.plan_type === 'trial' && (
-            <button
-              onClick={() => navigate('/upgrade')}
-              className="w-full flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#E6A85C] to-[#E85A9B] rounded-lg transition-colors mb-2 hover:shadow-md"
-            >
-              <Crown className="w-5 h-5 mr-3" />
-              Upgrade Plan
-            </button>
-          )}
-          <button
-            onClick={handleSignOut}
-            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
-          >
-            <LogOut className="w-5 h-5 mr-3" />
-            Sign Out
-          </button>
-        </div>
       </div>
-    </div>
-
-    {/* Main content */}
-    <div className="lg:pl-64">
-      {/* Top bar */}
-      <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
-        <button
-          type="button"
-          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
-          onClick={() => setSidebarOpen(true)}
-        >
-          <Menu className="h-6 w-6" />
-        </button>
-        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
-          <div className="flex flex-1"></div>
-          <div className="flex items-center gap-x-4 lg:gap-x-6">
-            {/* Subscription indicator for mobile */}
-            {subscriptionData?.subscription?.plan_type === 'trial' && subscriptionData?.daysRemaining !== undefined && subscriptionData?.daysRemaining <= 7 && (
-              <button
-                onClick={() => navigate('/upgrade')}
-                className="lg:hidden bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
-              >
-                <Clock className="h-3 w-3" />
-                {subscriptionData.daysRemaining}d left
-              </button>
-            )}
-            <div className="flex items-center space-x-3">
-              <div className="w-8 h-8 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-full flex items-center justify-center">
-                <span className="text-white text-sm font-medium">
-                  {user?.email?.charAt(0).toUpperCase()}
-                </span>
-              </div>
-              <div className="hidden md:block">
-                <p className="text-sm font-medium text-gray-900">
-                  {user?.email}
-                </p>
-                <p className="text-xs text-gray-500">Restaurant Owner</p>
-              </div>
-            </div>
-          </div>
-        </div>
-      </div>
       {/* Page content */}
       <main className="py-6">
         <div className="px-4 sm:px-6 lg:px-8">
@@ .. @@
   );
 }