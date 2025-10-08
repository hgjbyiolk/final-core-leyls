import React, { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  Users,
  Gift,
  Settings,
  LogOut,
  Menu,
  X,
  ChefHat,
  MapPin,
  Headphones as HeadphonesIcon,
  Wallet,
  BarChart3,
  Crown,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Navigation items
const navItems = [
  { name: "Home", icon: Home, path: "/dashboard" },
  { name: "Restaurants", icon: ChefHat, path: "/restaurants" },
  { name: "Reservations", icon: Clock, path: "/reservations" },
  { name: "Deals", icon: Gift, path: "/deals" },
  { name: "Membership", icon: Crown, path: "/membership" },
  { name: "Wallet", icon: Wallet, path: "/wallet" },
  { name: "Analytics", icon: BarChart3, path: "/analytics" },
  { name: "Users", icon: Users, path: "/users" },
  { name: "Locations", icon: MapPin, path: "/locations" },
  { name: "Support", icon: HeadphonesIcon, path: "/support" },
  { name: "Settings", icon: Settings, path: "/settings" },
];

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarCollapsed ? "w-20" : "w-64"
        } hidden md:flex flex-col bg-white shadow-lg transition-all duration-300 rounded-r-3xl relative`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center px-4 border-b border-gray-100 rounded-tr-3xl relative">
          <div className="flex items-center justify-center flex-1">
            {sidebarCollapsed ? (
              <img
                src="/SwooshLogo.svg"
                alt="Swoosh Logo"
                className="h-12 w-12 object-contain"
              />
            ) : (
              <img
                src="/leyls-svg.svg"
                alt="Leyls"
                className="h-12 w-auto object-contain"
              />
            )}
          </div>
        </div>

        {/* Collapse button */}
        <div className="absolute top-6 -right-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 bg-white border border-gray-200 shadow-md rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(({ name, icon: Icon, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={name}
                onClick={() => navigate(path)}
                className={`flex items-center w-full p-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`${
                    sidebarCollapsed ? "w-7 h-7" : "w-6 h-6 mr-3"
                  }`}
                />
                {!sidebarCollapsed && <span>{name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className={`flex items-center w-full p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <LogOut
              className={`${
                sidebarCollapsed ? "w-7 h-7" : "w-6 h-6 mr-3"
              }`}
            />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-64 bg-white shadow-xl">
            <div className="flex h-16 items-center px-4 border-b border-gray-100">
              <img
                src="/leyls-svg.svg"
                alt="Leyls"
                className="h-10 w-auto object-contain"
              />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="ml-auto p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navItems.map(({ name, icon: Icon, path }) => {
                const isActive = location.pathname === path;
                return (
                  <button
                    key={name}
                    onClick={() => {
                      navigate(path);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center w-full p-3 rounded-xl transition-colors ${
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-6 h-6 mr-3" />
                    <span>{name}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={logout}
                className="flex items-center w-full p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-6 h-6 mr-3" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-white h-16 px-4 shadow-sm md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img
            src="/leyls-svg.svg"
            alt="Leyls"
            className="h-10 w-auto object-contain"
          />
          <div className="w-10" /> {/* Spacer */}
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
