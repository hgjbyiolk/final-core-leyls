import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Headphones, Shield, User, Mail, Lock, Eye, EyeOff,
  AlertCircle, Loader2, Crown, Star, Building, Users,
  MessageSquare, Coffee, Monitor, Zap, CheckCircle
} from 'lucide-react';

const SupportPortalLogin: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Demo credentials
  const DEMO_CREDENTIALS = [
    { email: 'support@voya.com', password: 'VoyaSupport2025!', name: 'Sarah Johnson' },
    { email: 'agent@voya.com', password: 'VoyaAgent2025!', name: 'Mike Chen' },
    { email: 'help@voya.com', password: 'VoyaHelp2025!', name: 'Lisa Rodriguez' }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo, accept any email/password with a name, or use demo credentials
      const isDemoCredential = DEMO_CREDENTIALS.some(cred => 
        cred.email === credentials.email && cred.password === credentials.password
      );

      if (isDemoCredential || (credentials.email && credentials.password && credentials.name)) {
        const agent = {
          id: `agent_${Date.now()}`,
          name: credentials.name || DEMO_CREDENTIALS[0].name,
          email: credentials.email,
          role: 'agent',
          is_active: true,
          last_login_at: new Date().toISOString()
        };

        // Store support agent session
        localStorage.setItem('support_agent_data', JSON.stringify(agent));
        localStorage.setItem('support_agent_login_time', new Date().toISOString());
        
        navigate('/support-portal');
      } else {
        setError('Please fill in all fields or use demo credentials');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const useDemoCredentials = (index: number) => {
    const cred = DEMO_CREDENTIALS[index];
    setCredentials(cred);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Professional Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-6 shadow-2xl">
            <Headphones className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent font-['Space_Grotesk'] mb-2">
            VOYA Support Portal
          </h1>
          <p className="text-gray-600 text-lg">
            Professional customer support platform
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>Real-time Chat</span>
            </div>
            <div className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              <span>Multi-Restaurant</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>Secure</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Agent Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={credentials.name}
                  onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Your name as shown to customers"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="support@voya.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Headphones className="h-4 w-4" />
                  Access Support Portal
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Demo Agent Accounts
            </h3>
            <div className="space-y-2">
              {DEMO_CREDENTIALS.map((cred, index) => (
                <button
                  key={index}
                  onClick={() => useDemoCredentials(index)}
                  className="w-full text-left p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900 text-sm">{cred.name}</p>
                      <p className="text-blue-700 text-xs">{cred.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-blue-700 mt-3 text-center">
              Click any agent to auto-fill credentials
            </p>
          </div>

          {/* Features Preview */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <MessageSquare className="h-6 w-6 text-gray-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-900">Real-Time</p>
              <p className="text-xs text-gray-600">Messaging</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 text-gray-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-900">Multi-User</p>
              <p className="text-xs text-gray-600">Support</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Building className="h-6 w-6 text-gray-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-900">All</p>
              <p className="text-xs text-gray-600">Restaurants</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2025 VOYA Support Portal. Professional customer support platform.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportPortalLogin;