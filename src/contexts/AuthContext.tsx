import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { SubscriptionService } from '../services/subscriptionService';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  settings: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  restaurant: Restaurant | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    metadata: {
      firstName: string;
      lastName: string;
      restaurantName: string;
    }
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial session restore
  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        console.log('🔄 Getting initial session...');

        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('❌ Error getting session:', error);
          setLoading(false);
          return;
        }

        console.log('✅ Session retrieved:', session?.user?.id || 'No user');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('💥 Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id || 'No user');
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          setRestaurant(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // React to user changes (fetch restaurant only for restaurant users)
  useEffect(() => {
    if (!user) return;

    const role = user?.user_metadata?.role ?? user?.app_metadata?.role ?? 'restaurant_owner';

    console.log('🔍 User role detected:', role, 'for user:', user.email);
    
    if (role === 'support') {
      console.log('🛑 Support agent detected - blocking restaurant access');
      setRestaurant(null);
      return;
    }

    fetchRestaurant(user.id);
  }, [user]);

  // Subscription updates (refresh restaurant instead of full reload)
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      if (user) {
        console.log('🔄 Subscription updated, refreshing restaurant data');
        fetchRestaurant(user.id);
      }
    };

    window.addEventListener('subscription-updated', handleSubscriptionUpdate);
    return () => window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
  }, [user]);

  const fetchRestaurant = async (userId: string) => {
    try {
      console.log('🏪 Fetching restaurant for user:', userId);

      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, settings')
        .eq('owner_id', userId)
        .limit(1);

      if (error) {
        console.error('❌ Error fetching restaurant:', error);
        createDefaultRestaurant(userId);
        return;
      }

      if (data && data.length > 0) {
        console.log('✅ Restaurant found:', data[0].name);
        setRestaurant(data[0]);
        return;
      }

      console.log('🏗️ No restaurant found, creating default restaurant...');
      createDefaultRestaurant(userId);
    } catch (error) {
      console.error('💥 Error in fetchRestaurant:', error);
      createDefaultRestaurant(userId);
    }
  };

  const createDefaultRestaurant = async (userId: string) => {
    try {
      console.log('🏗️ Creating default restaurant for user:', userId);

      const { data: existingRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (existingRestaurant) {
        console.log('🏪 Restaurant already exists:', existingRestaurant.name);
        setRestaurant(existingRestaurant);
        return;
      }

      const { data: userData2 } = await supabase.auth.getUser();
      const user = userData2.user;

      const restaurantName = user?.user_metadata?.restaurant_name || 'My Restaurant';
      const baseSlug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${baseSlug}-${randomSuffix}`;

      console.log('🏗️ Creating restaurant:', restaurantName);

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantName,
          owner_id: userId,
          slug,
          settings: {
            points_per_dollar: 1,
            referral_bonus: 50,
            pointValueAED: 0.05,
            blanketMode: {
              enabled: true,
              type: 'manual',
              manualSettings: { pointsPerAED: 0.1 }
            },
            tier_thresholds: { silver: 500, gold: 1000 },
            loyalty_program: {
              name: 'Loyalty Program',
              description: 'Earn points with every purchase and redeem for rewards!'
            }
          }
        })
        .select()
        .single();

      if (restaurantError) {
        console.error('❌ Error creating restaurant:', restaurantError);
        if (restaurantError.code === '23505') {
          console.log('🔄 Duplicate detected, fetching existing restaurant...');
          const { data: duplicateRestaurant } = await supabase
            .from('restaurants')
            .select('*')
            .eq('owner_id', userId)
            .maybeSingle();
          if (duplicateRestaurant) {
            console.log('✅ Found existing restaurant after duplicate:', duplicateRestaurant.name);
            setRestaurant(duplicateRestaurant);
          }
        }
        return;
      }

      console.log('✅ Restaurant created:', restaurant.name);
      setRestaurant(restaurant);

      setTimeout(() => {
        createSampleRewards(restaurant.id).catch(console.warn);
        createSampleMenuItems(restaurant.id).catch(console.warn);
      }, 100);
    } catch (error) {
      console.error('💥 Error creating default restaurant:', error);
    }
  };

  const createSampleRewards = async (restaurantId: string) => {
    try {
      const sampleRewards = [
        { name: 'Free Appetizer', description: 'Choose any appetizer from our menu', points_required: 100, category: 'food', min_tier: 'bronze' },
        { name: 'Free Dessert', description: 'Complimentary dessert of your choice', points_required: 150, category: 'food', min_tier: 'bronze' },
        { name: 'Free Drink', description: 'Any beverage from our drink menu', points_required: 75, category: 'beverage', min_tier: 'bronze' },
        { name: '10% Off Next Visit', description: 'Get 10% discount on your next meal', points_required: 200, category: 'discount', min_tier: 'bronze' }
      ];

      await supabase
        .from('rewards')
        .insert(sampleRewards.map(reward => ({ ...reward, restaurant_id: restaurantId })));

      console.log('✅ Sample rewards created');
    } catch (error) {
      console.warn('⚠️ Failed to create sample rewards:', error);
    }
  };

  const createSampleMenuItems = async (restaurantId: string) => {
    try {
      const { MenuItemService } = await import('../services/menuItemService');
      await MenuItemService.createSampleMenuItems(restaurantId);
      console.log('✅ Sample menu items created');
    } catch (error) {
      console.warn('⚠️ Failed to create sample menu items:', error);
    }
  };

const signIn = async (
  email: string,
  password: string,
  loginType: 'restaurant' | 'support'
) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        return { error: 'Incorrect email or password. Please try again.' };
      }
      return { error: error.message };
    }

    const user = data.user;
    const userRole = user?.user_metadata?.role ?? user?.app_metadata?.role;

    // ✅ Validate role against login type
    if (loginType === 'restaurant' && userRole !== 'restaurant_owner') {
      return { error: 'This account is not a restaurant owner account.' };
    }
    if (loginType === 'support' && userRole !== 'support') {
      return { error: 'This account is not a support agent account.' };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

  const signUp = async (
    email: string,
    password: string,
    metadata: { firstName: string; lastName: string; restaurantName: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: metadata.firstName,
            last_name: metadata.lastName,
            restaurant_name: metadata.restaurantName,
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setTimeout(() => {
          SubscriptionService.createSubscription(data.user.id, 'trial').catch(console.warn);
        }, 100);
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    try {
      console.log('🔄 Starting sign out process...');

      setUser(null);
      setSession(null);
      setRestaurant(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Supabase sign out error:', error);
      } else {
        console.log('✅ Sign out successful');
      }
    } catch (error) {
      console.error('💥 Error during sign out:', error);
      setUser(null);
      setSession(null);
      setRestaurant(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const value = {
    user,
    session,
    restaurant,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
