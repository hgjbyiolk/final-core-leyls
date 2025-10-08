import React, { useState } from 'react';
import {
  Users, TrendingUp, Gift, DollarSign, ArrowUpRight, ArrowDownRight,
  Filter, Download, Eye, MoreVertical, RefreshCw, AlertCircle, Plus,
  Target, Percent, ShoppingCart, Repeat, TrendingDown, ChevronRight,
  Activity, Calendar, Clock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, Legend
} from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../contexts/AuthContext';
import LoyaltyROIDashboard from './LoyaltyROIDashboard';
import LoadingBar from './LoadingBar';
import { Link, useNavigate } from 'react-router-dom';

const DashboardHome = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [showROIDashboard, setShowROIDashboard] = useState(false);
  const { restaurant } = useAuth();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const navigate = useNavigate();

  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const {
    stats,
    recentActivity,
    customerGrowthData,
    rewardDistribution,
    weeklyActivity,
    loyaltyROI,
    monthlyTrends,
    notifications,
    loading,
    error,
    refreshData
  } = useDashboardData(timeRange);

  const iconMap = {
    'Total Customers': Users,
    'Total Points Issued': TrendingUp,
    'Rewards Claimed': Gift,
    'Revenue Impact': DollarSign
  };

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border-0 rounded-2xl shadow-xl">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <>
        <LoadingBar isLoading={loading} />
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded-xl w-64"></div>
            <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-sm">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md bg-white rounded-3xl p-8 shadow-sm">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-6 py-3 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-2xl hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Leyls!</h1>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#E6A85C] via-[#E85A9B] to-[#D946EF] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Set Up Your Restaurant</h2>
            <p className="text-gray-600 mb-6">
              It looks like your restaurant profile isn't set up yet. Please contact support or try refreshing the page.
            </p>
            <button
              onClick={refreshData}
              className="px-6 py-3 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white rounded-2xl hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <LoadingBar isLoading={loading} />
      <div className="space-y-6">
        {showROIDashboard ? (
          <LoyaltyROIDashboard timeRange={timeRange} />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#1A1D29] rounded-3xl p-8 shadow-lg">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">Available Funds</p>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="px-3 py-1.5 bg-white/10 text-white border-0 rounded-xl text-xs focus:ring-2 focus:ring-[#E85A9B] focus:outline-none"
                    >
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                    </select>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                    <p className="text-xs text-gray-400 mb-2">Available Funds</p>
                    <div className="flex items-baseline gap-2 mb-6">
                      <h2 className="text-5xl font-bold text-white">
                        {stats.find(s => s.name === 'Total Customers')?.value || '0'}
                      </h2>
                      <span className="text-gray-400 text-lg">.00</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl transition-all text-sm font-medium">
                        <Activity className="h-4 w-4" />
                        Send
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl transition-all text-sm font-medium">
                        <Download className="h-4 w-4" />
                        Request
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-white">Recent Contacts</p>
                    <button className="text-gray-400 hover:text-white text-sm">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    {recentActivity.slice(0, 5).map((activity, idx) => (
                      <div key={idx} className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E6A85C] via-[#E85A9B] to-[#D946EF] flex items-center justify-center text-white font-medium shadow-lg">
                        {activity.avatar}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-2xl transition-all text-sm font-medium">
                      Add new
                    </button>
                    <button className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-2xl transition-all text-sm font-medium">
                      Manage
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm text-gray-500 mb-1">Total Expenses</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(parseFloat(stats.find(s => s.name === 'Revenue Impact')?.value.replace(/[^0-9.-]+/g, '') || '0'))}
                      </p>
                      <span className="text-sm text-green-600 font-medium">-8% vs Prev year</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
                <div className="h-40 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerGrowthData.slice(-6)}>
                      <Bar dataKey="newCustomers" fill="#E6A85C" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm text-gray-500 mb-3">Total Income</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(parseFloat(stats.find(s => s.name === 'Total Points Issued')?.value.replace(/[^0-9.-]+/g, '') || '0') * 10)}
                      </p>
                      <span className="text-sm text-green-600 font-medium">+14% vs Prev year</span>
                    </div>
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerGrowthData.slice(-6)}>
                        <Bar dataKey="returningCustomers" fill="#E85A9B" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
                      <p className="text-sm text-gray-500">You can view your transaction history</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors">
                        <Filter className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors">
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {recentActivity.slice(0, 8).map((activity, index) => (
                    <div
                      key={activity.id}
                      className="p-6 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white flex items-center justify-center font-medium shadow-md">
                          {activity.avatar}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">{activity.customer}</p>
                            <span className="text-xs text-gray-400">#{Math.floor(Math.random() * 1000000)}</span>
                          </div>
                          <p className="text-sm text-gray-500">{activity.time}</p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              activity.action.includes('Redeemed') ? 'bg-yellow-100 text-yellow-800' :
                              activity.action.includes('Earned') ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {activity.action.includes('Redeemed') ? 'Received' :
                               activity.action.includes('Earned') ? 'Sent' : 'Payment'}
                            </span>
                          </div>

                          <div className="text-right min-w-[80px]">
                            <p className={`text-sm font-semibold ${
                              activity.action.includes('Earned') ? 'text-green-600' : 'text-gray-900'
                            }`}>
                              {activity.action.includes('Earned') ? '+' : ''}{activity.points} pts
                            </p>
                          </div>

                          <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-gray-100">
                  <button
                    onClick={() => navigate('/customers')}
                    className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    View all transactions
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Exchange</h3>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">USD</span>
                      </div>
                      <span className="font-semibold text-gray-900">300</span>
                    </div>

                    <div className="flex justify-center">
                      <button className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                        <ArrowUpRight className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E6A85C] to-[#E85A9B] flex items-center justify-center">
                          <span className="text-white text-xs font-bold">€</span>
                        </div>
                        <span className="font-medium text-gray-900">EUR</span>
                      </div>
                      <span className="font-semibold text-gray-900">275.68</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                      <span>100 USD = 0.92 Euro</span>
                      <span>Exchange Fee: $12.44</span>
                    </div>

                    <button className="w-full bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all mt-4">
                      Exchange
                    </button>
                  </div>
                </div>

                {stats.slice(0, 2).map((stat, index) => {
                  const Icon = iconMap[stat.name as keyof typeof iconMap] || Users;
                  return (
                    <div
                      key={stat.name}
                      className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-[#E6A85C]/10 via-[#E85A9B]/10 to-[#D946EF]/10">
                          <Icon className="h-6 w-6 text-[#E85A9B]" />
                        </div>
                        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          stat.trend === 'up'
                            ? 'text-green-700 bg-green-100'
                            : 'text-red-700 bg-red-100'
                        }`}>
                          <span>{stat.change}</span>
                          {stat.trend === 'up' ? (
                            <ArrowUpRight className="h-3 w-3 ml-1" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 ml-1" />
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">{stat.name}</h3>
                        <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {monthlyTrends.length > 0 && (
              <div className="bg-white rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Revenue Trends</h2>
                    <p className="text-sm text-gray-500">Monthly performance overview</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowROIDashboard(!showROIDashboard)}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white hover:shadow-lg transition-all"
                    >
                      ROI Analysis
                    </button>
                    <button
                      onClick={refreshData}
                      className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-all"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip content={renderCustomTooltip} />
                      <Bar
                        dataKey="revenue"
                        fill="#E6A85C"
                        radius={[8, 8, 0, 0]}
                        name="Total Revenue ($)"
                      />
                      <Bar
                        dataKey="loyaltyRevenue"
                        fill="#E85A9B"
                        radius={[8, 8, 0, 0]}
                        name="Loyalty Revenue ($)"
                      />
                      <Line
                        type="monotone"
                        dataKey="netProfit"
                        stroke="#D946EF"
                        strokeWidth={3}
                        dot={{ fill: '#D946EF', r: 4 }}
                        name="Net Profit ($)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default DashboardHome;
