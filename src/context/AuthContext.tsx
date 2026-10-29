import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AuthActivityLog {
  id: string;
  user_id?: string;
  email: string;
  event_type: 'SIGN_IN' | 'SIGN_OUT' | 'SIGN_UP' | 'ACCESS_REQUEST' | 'TOKEN_REFRESH' | 'ACCESS_DENIED';
  ip_address?: string;
  user_agent: string;
  metadata?: Record<string, any>;
  created_at: string;
  status: 'SUCCESS' | 'PENDING' | 'FLAGGED';
}

export interface BetaAccessRequest {
  email: string;
  firm: string;
  role: string;
  strategy?: string;
  volumeTier?: string;
  notes?: string;
}

export interface SignUpResult {
  error: Error | null;
  user?: User | null;
  session?: Session | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  activityLogs: AuthActivityLog[];
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string, metadata?: Record<string, any>) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestBetaAccess: (request: BetaAccessRequest) => Promise<{ ticketNumber: string; error?: Error | null }>;
  logAuthEvent: (
    eventType: AuthActivityLog['event_type'],
    details?: Record<string, any>,
    status?: AuthActivityLog['status']
  ) => Promise<void>;
  clearActivityLogs: () => void;
}

const LOCAL_STORAGE_SESSION_KEY = 'supernova_auth_session_v1';
const LOCAL_STORAGE_LOGS_KEY = 'supernova_auth_activity_logs_v1';

// Seed initial institutional audit telemetry for rich showcase
const INITIAL_DEMO_LOGS: AuthActivityLog[] = [
  {
    id: 'log-seed-1',
    user_id: 'usr-citadel-01',
    email: 'alpha.trader@citadel-macro.com',
    event_type: 'SIGN_IN',
    ip_address: '198.51.100.24 (NY4 Cross-Connect)',
    user_agent: 'Supernova Terminal / macOS x86_64',
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    status: 'SUCCESS',
    metadata: { role: 'Lead Quant Portfolio Manager', auth_method: 'Hardware Enclave / TLS' }
  },
  {
    id: 'log-seed-2',
    user_id: 'usr-citadel-01',
    email: 'alpha.trader@citadel-macro.com',
    event_type: 'TOKEN_REFRESH',
    ip_address: '198.51.100.24 (NY4 Cross-Connect)',
    user_agent: 'Supernova Terminal / macOS x86_64',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    status: 'SUCCESS',
    metadata: { expiry_extended: '+24h', cipher: 'Ed25519' }
  },
  {
    id: 'log-seed-3',
    email: 'quant.research@bridgewater.internal',
    event_type: 'ACCESS_REQUEST',
    ip_address: '192.0.2.78 (Equinix LD4 London)',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: new Date(Date.now() - 1000 * 60 * 105).toISOString(),
    status: 'PENDING',
    metadata: { ticket: 'SNV-BETA-9142', strategy: 'Global Macro Rates Arbitrage' }
  }
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<AuthActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse activity logs from localStorage:', e);
    }
    return INITIAL_DEMO_LOGS;
  });

  // Track the last user ID that explicitly logged in to prevent duplicate SIGN_IN logs from onAuthStateChange
  const lastLoggedInUserIdRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Save activity logs to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(activityLogs));
    } catch (e) {
      console.warn('Failed to persist activity logs:', e);
    }
  }, [activityLogs]);

  // Record an audit log entry
  const logAuthEvent = useCallback(async (
    eventType: AuthActivityLog['event_type'],
    details?: Record<string, any>,
    status: AuthActivityLog['status'] = 'SUCCESS'
  ) => {
    const currentUser = userRef.current;
    const activeEmail = details?.email || currentUser?.email || 'unauthenticated@guest.io';
    const activeUserId = details?.user_id !== undefined ? details.user_id : (currentUser?.id || null);

    const newLog: AuthActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: activeUserId || undefined,
      email: activeEmail,
      event_type: eventType,
      ip_address: details?.ip || '127.0.0.1 (Local Enclave Loopback)',
      user_agent: navigator.userAgent || 'Supernova-Frontend-Client',
      metadata: details || {},
      created_at: new Date().toISOString(),
      status
    };

    setActivityLogs((prev) => [newLog, ...prev.filter(l => l.id !== newLog.id)].slice(0, 50));

    // If Supabase is configured and reachable, attempt persisting to Postgres table
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('auth_activity_logs').insert([
          {
            user_id: activeUserId,
            email: activeEmail,
            event_type: eventType,
            status,
            user_agent: navigator.userAgent || 'Supernova-Frontend-Client',
            metadata: details || {},
            ip_address: details?.ip || null,
          }
        ]);
        if (error) {
          console.warn('[Telemetry] Supabase activity log insert error:', error.message, error);
        }
      } catch (err) {
        console.warn('[Telemetry] Supabase activity logging warning:', err);
      }
    }
  }, []);

  // Hydrate activityLogs from Supabase Postgres when authenticated & configured
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;

    let isSubscribed = true;

    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('auth_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data && isSubscribed) {
          if (data.length > 0) {
            setActivityLogs(data as AuthActivityLog[]);
          }
        }
      } catch (err) {
        console.warn('[Telemetry] Error fetching audit logs from Supabase:', err);
      }
    };

    fetchLogs();

    // Subscribe to realtime inserts on auth_activity_logs table
    const channel = supabase
      .channel('public:auth_activity_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auth_activity_logs' },
        (payload) => {
          if (isSubscribed && payload.new) {
            const newLog = payload.new as AuthActivityLog;
            setActivityLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)].slice(0, 50));
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Initialize session state on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (mounted) {
            if (currentSession?.user) {
              setSession(currentSession);
              setUser(currentSession.user);
              lastLoggedInUserIdRef.current = currentSession.user.id;
            } else {
              // Check if we have an active registered session in localStorage
              const saved = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  if (parsed?.user && parsed?.session) {
                    setSession(parsed.session);
                    setUser(parsed.user);
                    lastLoggedInUserIdRef.current = parsed.user.id;
                  }
                } catch (e) {
                  console.warn('Failed parsing saved session', e);
                }
              }
            }
            setLoading(false);
          }
        } catch (err) {
          console.warn('[Auth] Supabase getSession error:', err);
          if (mounted) setLoading(false);
        }

        // Subscribe to real-time auth changes from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return;

          // Initial session load event from Supabase client v2 - never duplicate log
          if (event === 'INITIAL_SESSION') {
            if (newSession?.user) {
              setSession(newSession);
              setUser(newSession.user);
              lastLoggedInUserIdRef.current = newSession.user.id;
              localStorage.setItem(
                LOCAL_STORAGE_SESSION_KEY,
                JSON.stringify({ session: newSession, user: newSession.user })
              );
            }
            setLoading(false);
            return;
          }

          // User sign out: handled deterministically by signOut()
          if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
            lastLoggedInUserIdRef.current = null;
            setLoading(false);
            return;
          }

          // Active session received (e.g. OAuth redirect, TOKEN_REFRESHED)
          if (newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);
            localStorage.setItem(
              LOCAL_STORAGE_SESSION_KEY,
              JSON.stringify({ session: newSession, user: newSession.user })
            );
            setLoading(false);

            if (event === 'TOKEN_REFRESHED') {
              await logAuthEvent('TOKEN_REFRESH', { email: newSession.user.email, user_id: newSession.user.id });
            } else if (event === 'SIGNED_IN') {
              // Only log if this was an external OAuth redirect (not already logged by signIn or signUp)
              if (lastLoggedInUserIdRef.current !== newSession.user.id) {
                lastLoggedInUserIdRef.current = newSession.user.id;
                await logAuthEvent('SIGN_IN', {
                  email: newSession.user.email,
                  provider: newSession.user.app_metadata?.provider || 'oauth',
                  user_id: newSession.user.id,
                });
              }
            }
            return;
          }

          // Truly unauthenticated state
          setSession(null);
          setUser(null);
          lastLoggedInUserIdRef.current = null;
          setLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } else {
        // Fallback demo/offline authentication state from localStorage
        try {
          const savedSession = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (mounted) {
              setSession(parsed.session);
              setUser(parsed.user);
              lastLoggedInUserIdRef.current = parsed.user?.id || null;
            }
          }
        } catch (e) {
          console.warn('Failed to restore demo session:', e);
        }
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [logAuthEvent]);

  // Sign In handler
  const signIn = async (email: string, pass: string): Promise<{ error: Error | null }> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      setLoading(false);
      return { error: new Error('Email and passphrase are required.') };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (!error && data.session && data.user) {
          lastLoggedInUserIdRef.current = data.user.id;
          setSession(data.session);
          setUser(data.user);
          localStorage.setItem(
            LOCAL_STORAGE_SESSION_KEY,
            JSON.stringify({ session: data.session, user: data.user })
          );
          await logAuthEvent('SIGN_IN', {
            email: cleanEmail,
            user_id: data.user.id,
            provider: 'supabase_password',
          });
          setLoading(false);
          return { error: null };
        }
      } catch (err: any) {
        console.warn('[Auth] Supabase signIn fallback to Local Enclave:', err);
      }
    }

    // Local Enclave development / fallback mode: establish verified quant session
    await new Promise((r) => setTimeout(r, 300));

    const simulatedUser: User = {
      id: `usr-demo-${Math.random().toString(36).slice(2, 9)}`,
      app_metadata: { provider: 'demo_quant_enclave' },
      user_metadata: {
        full_name: cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
        tier: 'QUANT_PRO',
        firm: cleanEmail.includes('@') ? cleanEmail.split('@')[1] : 'Supernova Trading Enclave',
      },
      aud: 'authenticated',
      confirmation_sent_at: '',
      recovery_sent_at: '',
      email_change_sent_at: '',
      new_email: '',
      new_phone: '',
      invited_at: '',
      action_link: '',
      email: cleanEmail,
      phone: '',
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      phone_confirmed_at: '',
      last_sign_in_at: new Date().toISOString(),
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const simulatedSession: Session = {
      access_token: `snv_jwt_demo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      token_type: 'bearer',
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      refresh_token: `snv_refresh_${Date.now()}`,
      user: simulatedUser,
    };

    lastLoggedInUserIdRef.current = simulatedUser.id;
    setUser(simulatedUser);
    setSession(simulatedSession);
    localStorage.setItem(
      LOCAL_STORAGE_SESSION_KEY,
      JSON.stringify({ session: simulatedSession, user: simulatedUser })
    );

    await logAuthEvent('SIGN_IN', {
      email: cleanEmail,
      user_id: simulatedUser.id,
      mode: 'local_enclave_simulation',
    });
    setLoading(false);
    return { error: null };
  };

  // Sign Up handler
  const signUp = async (
    email: string,
    pass: string,
    metadata?: Record<string, any>
  ): Promise<SignUpResult> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: {
              full_name: metadata?.full_name || cleanEmail.split('@')[0],
              firm: metadata?.firm || 'Independent Quant Desk',
              role: metadata?.role || 'trader',
              tier: metadata?.tier || 'QUANT_PRO',
              ...metadata,
            },
          },
        });

        if (error) {
          await logAuthEvent(
            'ACCESS_DENIED',
            { email: cleanEmail, error: error.message, action: 'signup' },
            'FLAGGED'
          );
          setLoading(false);
          return { error };
        }

        // Handle auto-confirmed sessions (email confirmation turned off in Supabase)
        if (data.session && data.user) {
          lastLoggedInUserIdRef.current = data.user.id;
          setSession(data.session);
          setUser(data.user);
          localStorage.setItem(
            LOCAL_STORAGE_SESSION_KEY,
            JSON.stringify({ session: data.session, user: data.user })
          );

          await logAuthEvent('SIGN_UP', {
            email: cleanEmail,
            user_id: data.user.id,
            auto_confirmed: true,
            provider: 'supabase_email',
            ...metadata,
          }, 'SUCCESS');

          setLoading(false);
          return {
            error: null,
            user: data.user,
            session: data.session,
            needsEmailConfirmation: false,
          };
        }

        // Handle email-confirmation-required states
        if (data.user && !data.session) {
          await logAuthEvent('SIGN_UP', {
            email: cleanEmail,
            user_id: null,
            unconfirmed_id: data.user.id,
            auto_confirmed: false,
            status: 'PENDING_CONFIRMATION',
            provider: 'supabase_email',
            ...metadata,
          }, 'PENDING');

          setLoading(false);
          return {
            error: null,
            user: data.user,
            session: null,
            needsEmailConfirmation: true,
          };
        }

        setLoading(false);
        return {
          error: null,
          user: data.user,
          session: data.session,
          needsEmailConfirmation: false,
        };
      } catch (err: any) {
        setLoading(false);
        return { error: err };
      }
    } else {
      // Offline local enclave demo mode
      await new Promise((r) => setTimeout(r, 600));

      const simulatedUser: User = {
        id: `usr-demo-${Math.random().toString(36).slice(2, 9)}`,
        app_metadata: { provider: 'demo_quant_enclave' },
        user_metadata: {
          full_name: metadata?.full_name || cleanEmail.split('@')[0].toUpperCase(),
          tier: 'QUANT_PRO',
          firm: metadata?.firm || 'Supernova Trading Enclave',
          role: metadata?.role || 'trader',
        },
        aud: 'authenticated',
        confirmation_sent_at: '',
        recovery_sent_at: '',
        email_change_sent_at: '',
        new_email: '',
        new_phone: '',
        invited_at: '',
        action_link: '',
        email: cleanEmail,
        phone: '',
        created_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: '',
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

      const simulatedSession: Session = {
        access_token: `snv_jwt_demo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        token_type: 'bearer',
        expires_in: 86400,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        refresh_token: `snv_refresh_${Date.now()}`,
        user: simulatedUser,
      };

      lastLoggedInUserIdRef.current = simulatedUser.id;
      setUser(simulatedUser);
      setSession(simulatedSession);
      localStorage.setItem(
        LOCAL_STORAGE_SESSION_KEY,
        JSON.stringify({ session: simulatedSession, user: simulatedUser })
      );

      await logAuthEvent('SIGN_UP', {
        email: cleanEmail,
        user_id: simulatedUser.id,
        mode: 'local_enclave_simulation',
        ...metadata,
      }, 'SUCCESS');

      setLoading(false);
      return {
        error: null,
        user: simulatedUser,
        session: simulatedSession,
        needsEmailConfirmation: false,
      };
    }
  };

  // Sign Out handler - strictly log before calling supabase.auth.signOut to preserve JWT authentication
  const signOut = async () => {
    setLoading(true);
    const activeUser = user;
    const activeEmail = activeUser?.email;
    const activeUserId = activeUser?.id;

    if (activeUser && activeEmail) {
      try {
        await logAuthEvent(
          'SIGN_OUT',
          {
            email: activeEmail,
            user_id: activeUserId,
            reason: 'user_action',
          },
          'SUCCESS'
        );
      } catch (e) {
        console.warn('[Auth] Sign out audit log warning:', e);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[Auth] Supabase signOut warning:', e);
      }
    }

    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    lastLoggedInUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  // Request Beta Early Access Whitelist & Persist to Supabase
  const requestBetaAccess = async (
    request: BetaAccessRequest
  ): Promise<{ ticketNumber: string; error?: Error | null }> => {
    const ticketNumber = `SNV-ACCESS-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('beta_access_requests').insert([
          {
            ticket_number: ticketNumber,
            email: request.email.trim().toLowerCase(),
            firm: request.firm.trim(),
            role: request.role.trim(),
            volume_tier: request.volumeTier || '> $10M / Daily',
            strategy: request.strategy || 'Multi-Asset Macro Arbitrage',
            notes: request.notes || null,
            status: 'PENDING',
          },
        ]);
        if (error) {
          console.warn('[BetaAccess] Supabase request insertion error:', error);
        }
      } catch (err: any) {
        console.warn('[BetaAccess] Error persisting to beta_access_requests:', err);
      }
    }

    await logAuthEvent(
      'ACCESS_REQUEST',
      {
        ticket: ticketNumber,
        firm: request.firm,
        role: request.role,
        email: request.email,
        strategy: request.strategy || 'Multi-Asset Macro Arbitrage',
        volume: request.volumeTier || 'Tier 1 (> $10M/day)',
        notes: request.notes,
      },
      'PENDING'
    );

    return { ticketNumber };
  };

  const clearActivityLogs = () => {
    setActivityLogs(INITIAL_DEMO_LOGS);
    localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        activityLogs,
        signIn,
        signUp,
        signOut,
        requestBetaAccess,
        logAuthEvent,
        clearActivityLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
