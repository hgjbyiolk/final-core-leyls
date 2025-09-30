import React from "react";
import { Navigate } from "react-router-dom";
import { useSupportAuth } from "../contexts/SupportAuthContext";

const SupportProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { agent, loading } = useSupportAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1E2A78] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-xs text-gray-400 mt-2">Setting up support system</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    // No support agent logged in
    return <Navigate to="/support-portal-login" replace />;
  }

  return <>{children}</>;
};

export default SupportProtectedRoute;
