// File: DashboardLayout.tsx
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
return () => { if (pollInterval) clearInterval(pollInterval); };
}
}, []);


const checkSubscription = async (forceRefresh: boolean = false) => {
if (!user) return;
const now = Date.now();
const SUBSCRIPTION_CACHE_DURATION = 5 * 1000;
if (!forceRefresh && subscriptionData && (now - lastSubscriptionCheck) < SUBSCRIPTION_CACHE_DURATION) {
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