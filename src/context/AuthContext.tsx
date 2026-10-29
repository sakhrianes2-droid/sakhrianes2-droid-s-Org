import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, supabase, isSupabaseConfigured, createEnclaveJwt } from '../lib/supabase';

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
  confirmationCode?: string;
}

export interface EmailExistenceResult {
  exists: boolean;
  source: 'supabase' | 'enclave';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  activityLogs: AuthActivityLog[];
  checkEmailExists: (email: string) => Promise<EmailExistenceResult>;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string, metadata?: Record<string, any>) => Promise<SignUpResult>;
  verifyEmailConfirmation: (
    email: string,
    code: string,
    metadata?: Record<string, any>
  ) => Promise<{ error: Error | null }>;
  resendEmailConfirmation: (
    email: string,
    fullName?: string
  ) => Promise<{ error: Error | null; confirmationCode?: string }>;
  signInWithGoogle: (
    gmailAddress?: string
  ) => Promise<{
    error: Error | null;
    needsConfirmation?: boolean;
    email?: string;
    confirmationCode?: string;
  }>;
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
const LOCAL_STORAGE_EMAILS_KEY = 'supernova_registered_emails_v1';

const DEFAULT_REGISTERED_EMAILS = [
  'chief.quant@supernova.ai',
  'alpha.trader@citadel-macro.com',
  'quant.research@bridgewater.internal',
  'macro.desk@millennium.com',
];

function getLocalRegisteredEmails(): Set<string> {
  const set = new Set<string>(DEFAULT_REGISTERED_EMAILS);
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EMAILS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') set.add(item.trim().toLowerCase());
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return set;
}

function addLocalRegisteredEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return;
  const set = getLocalRegisteredEmails();
  set.add(clean);
  try {
    localStorage.setItem(LOCAL_STORAGE_EMAILS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage write errors
  }
  fetch('/api/auth/register-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: clean }),
  }).catch(() => {});
}

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
    metadata: { role: 'Lead Quant Portfolio Manager', auth_method: 'Hardware Enclave / PKCE' },
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
    metadata: { expiry_extended: '+24h', cipher: 'ES256' },
  },
  {
    id: 'log-seed-3',
    email: 'quant.research@bridgewater.internal',
    event_type: 'ACCESS_REQUEST',
    ip_address: '192.0.2.78 (Equinix LD4 London)',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: new Date(Date.now() - 1000 * 60 * 105).toISOString(),
    status: 'PENDING',
    metadata: { ticket: 'SNV-BETA-9142', strategy: 'Global Macro Rates Arbitrage' },
  },
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

  // Track last logged-in user ID and last event timestamp to filter duplicate onAuthStateChange logs on page reload / tab focus
  const lastLoggedInUserIdRef = useRef<string | null>(null);
  const lastAuthEventTimeRef = useRef<Record<string, number>>({});
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

  // Record an audit log entry in both user_activity_logs and auth_activity_logs
  const logAuthEvent = useCallback(
    async (
      eventType: AuthActivityLog['event_type'],
      details?: Record<string, any>,
      status: AuthActivityLog['status'] = 'SUCCESS'
    ) => {
      const currentUser = userRef.current;
      const activeEmail = details?.email || currentUser?.email || 'unauthenticated@guest.io';
      const activeUserId = details?.user_id !== undefined ? details.user_id : currentUser?.id || null;

      // Deduplicate rapid identical events (e.g. tab focus / reload firing onAuthStateChange)
      const dedupeKey = `${eventType}:${activeUserId || activeEmail}`;
      const nowMs = Date.now();
      const prevMs = lastAuthEventTimeRef.current[dedupeKey] || 0;
      if (nowMs - prevMs < 2500 && !details?.forceLog) {
        return;
      }
      lastAuthEventTimeRef.current[dedupeKey] = nowMs;

      const newLog: AuthActivityLog = {
        id: `log-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: activeUserId || undefined,
        email: activeEmail,
        event_type: eventType,
        ip_address: details?.ip || '127.0.0.1 (Local Enclave Loopback)',
        user_agent: navigator.userAgent || 'Supernova-Frontend-Client',
        metadata: details || {},
        created_at: new Date().toISOString(),
        status,
      };

      setActivityLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)].slice(0, 50));

      // If Supabase is configured and reachable, persist to both user_activity_logs and auth_activity_logs
      if (isSupabaseConfigured) {
        const logPayload = {
          user_id: activeUserId,
          email: activeEmail,
          event_type: eventType,
          status,
          user_agent: navigator.userAgent || 'Supernova-Frontend-Client',
          metadata: details || {},
          ip_address: details?.ip || null,
        };
        try {
          await Promise.allSettled([
            supabase.from('user_activity_logs').insert([logPayload]),
            supabase.from('auth_activity_logs').insert([logPayload]),
          ]);
        } catch (err) {
          console.warn('[Telemetry] Supabase activity logging warning:', err);
        }
      }
    },
    []
  );

  // Check if an email address is already registered (Step 2 of Progressive Disclosure Flow)
  const checkEmailExists = useCallback(async (email: string): Promise<EmailExistenceResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { exists: false, source: 'enclave' };
    }

    // 1. Query Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { data: rpcExists, error: rpcError } = await supabase.rpc('check_email_exists', {
          lookup_email: cleanEmail,
        });
        if (!rpcError && typeof rpcExists === 'boolean') {
          if (rpcExists) addLocalRegisteredEmail(cleanEmail);
          return { exists: rpcExists, source: 'supabase' };
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!profileError && profileData?.id) {
          addLocalRegisteredEmail(cleanEmail);
          return { exists: true, source: 'supabase' };
        }
      } catch {
        // Fallback to backend / local enclave check
      }
    }

    // 2. Check local registered emails set
    const localSet = getLocalRegisteredEmails();
    if (localSet.has(cleanEmail)) {
      return { exists: true, source: 'enclave' };
    }

    // 3. Query backend /api/auth/check-email
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.exists) {
          addLocalRegisteredEmail(cleanEmail);
          return { exists: true, source: 'enclave' };
        }
      }
    } catch {
      // Ignore network error
    }

    return { exists: false, source: isSupabaseConfigured ? 'supabase' : 'enclave' };
  }, []);

  // Hydrate activityLogs from Supabase Postgres when authenticated & configured
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;

    let isSubscribed = true;

    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('user_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data && isSubscribed && data.length > 0) {
          setActivityLogs(data as AuthActivityLog[]);
          return;
        }

        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('auth_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!fallbackErr && fallbackData && isSubscribed && fallbackData.length > 0) {
          setActivityLogs(fallbackData as AuthActivityLog[]);
        }
      } catch (err) {
        console.warn('[Telemetry] Error fetching audit logs from Supabase:', err);
      }
    };

    fetchLogs();

    const channel = supabase
      .channel('public:user_activity_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_activity_logs' },
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
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
          if (mounted) {
            if (currentSession?.user) {
              setSession(currentSession);
              setUser(currentSession.user);
              lastLoggedInUserIdRef.current = currentSession.user.id;
            } else {
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

        // Subscribe to real-time auth changes from Supabase, filtering duplicate reload/focus events
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return;

          // Ignore INITIAL_SESSION or tab-focus duplicate SIGNED_IN for an already-tracked user
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

          if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
            lastLoggedInUserIdRef.current = null;
            setLoading(false);
            return;
          }

          if (newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);
            localStorage.setItem(
              LOCAL_STORAGE_SESSION_KEY,
              JSON.stringify({ session: newSession, user: newSession.user })
            );
            setLoading(false);

            if (event === 'TOKEN_REFRESHED') {
              await logAuthEvent('TOKEN_REFRESH', {
                email: newSession.user.email,
                user_id: newSession.user.id,
              });
            } else if (event === 'SIGNED_IN') {
              if (lastLoggedInUserIdRef.current !== newSession.user.id) {
                lastLoggedInUserIdRef.current = newSession.user.id;
                await logAuthEvent('SIGN_IN', {
                  email: newSession.user.email,
                  provider: newSession.user.app_metadata?.provider || 'pkce_oauth',
                  user_id: newSession.user.id,
                });
              }
            }
            return;
          }

          setSession(null);
          setUser(null);
          lastLoggedInUserIdRef.current = null;
          setLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } else {
        try {
          const savedSession = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (mounted && parsed?.user) {
              // Ensure session access_token is a valid 3-part JWT
              const validJwt =
                parsed.session?.access_token?.split('.').length === 3
                  ? parsed.session.access_token
                  : createEnclaveJwt(parsed.user.id, parsed.user.email || 'quant@supernova.ai');
              const hydratedSession = {
                ...parsed.session,
                access_token: validJwt,
              };
              setSession(hydratedSession);
              setUser(parsed.user);
              lastLoggedInUserIdRef.current = parsed.user.id || null;
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
          addLocalRegisteredEmail(cleanEmail);
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

    await new Promise((r) => setTimeout(r, 250));

    const userId = `usr-demo-${Math.random().toString(36).slice(2, 9)}`;
    const simulatedUser: User = {
      id: userId,
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

    const jwtToken = createEnclaveJwt(userId, cleanEmail, 86400);
    const simulatedSession: Session = {
      access_token: jwtToken,
      token_type: 'bearer',
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      refresh_token: `snv_refresh_${Date.now()}`,
      user: simulatedUser,
    };

    lastLoggedInUserIdRef.current = simulatedUser.id;
    addLocalRegisteredEmail(cleanEmail);
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

        addLocalRegisteredEmail(cleanEmail);

        if (data.session && data.user) {
          lastLoggedInUserIdRef.current = data.user.id;
          setSession(data.session);
          setUser(data.user);
          localStorage.setItem(
            LOCAL_STORAGE_SESSION_KEY,
            JSON.stringify({ session: data.session, user: data.user })
          );

          await logAuthEvent(
            'SIGN_UP',
            {
              email: cleanEmail,
              user_id: data.user.id,
              auto_confirmed: true,
              provider: 'supabase_email',
              ...metadata,
            },
            'SUCCESS'
          );

          setLoading(false);
          return {
            error: null,
            user: data.user,
            session: data.session,
            needsEmailConfirmation: false,
          };
        }

        if (data.user && !data.session) {
          let generatedCode: string | undefined;
          try {
            const resp = await fetch('/api/auth/send-confirmation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, fullName: metadata?.full_name }),
            });
            if (resp.ok) {
              const payload = await resp.json();
              generatedCode = payload.confirmation_code;
            }
          } catch {
            // Ignore fallback error
          }

          await logAuthEvent(
            'SIGN_UP',
            {
              email: cleanEmail,
              user_id: null,
              unconfirmed_id: data.user.id,
              auto_confirmed: false,
              status: 'PENDING_CONFIRMATION',
              provider: 'supabase_email',
              ...metadata,
            },
            'PENDING'
          );

          setLoading(false);
          return {
            error: null,
            user: data.user,
            session: null,
            needsEmailConfirmation: true,
            confirmationCode: generatedCode,
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
      let generatedCode = String(Math.floor(100000 + Math.random() * 900000));
      try {
        const resp = await fetch('/api/auth/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, fullName: metadata?.full_name }),
        });
        if (resp.ok) {
          const payload = await resp.json();
          if (payload.confirmation_code) {
            generatedCode = payload.confirmation_code;
          }
        }
      } catch {
        // Fallback to generated code
      }

      await logAuthEvent(
        'SIGN_UP',
        {
          email: cleanEmail,
          user_id: null,
          status: 'PENDING_GMAIL_CONFIRMATION',
          mode: 'local_enclave_simulation',
          ...metadata,
        },
        'PENDING'
      );

      setLoading(false);
      return {
        error: null,
        user: null,
        session: null,
        needsEmailConfirmation: true,
        confirmationCode: generatedCode,
      };
    }
  };

  // Verify 6-digit Gmail / Email Confirmation Code
  const verifyEmailConfirmation = async (
    email: string,
    code: string,
    metadata?: Record<string, any>
  ): Promise<{ error: Error | null }> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail || cleanCode.length < 6) {
      setLoading(false);
      return { error: new Error('Please enter the 6-digit confirmation code.') };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'signup',
        });

        if (!error && data.session && data.user) {
          lastLoggedInUserIdRef.current = data.user.id;
          addLocalRegisteredEmail(cleanEmail);
          setSession(data.session);
          setUser(data.user);
          localStorage.setItem(
            LOCAL_STORAGE_SESSION_KEY,
            JSON.stringify({ session: data.session, user: data.user })
          );
          await logAuthEvent('SIGN_IN', {
            email: cleanEmail,
            user_id: data.user.id,
            provider: 'gmail_otp_verified',
          });
          setLoading(false);
          return { error: null };
        }
      } catch {
        // Fallback to backend confirmation verification
      }
    }

    try {
      const res = await fetch('/api/auth/verify-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setLoading(false);
        return {
          error: new Error(errData.detail || 'Invalid or expired confirmation code.'),
        };
      }
    } catch {
      setLoading(false);
      return { error: new Error('Could not verify confirmation code. Please try again.') };
    }

    const userId = `usr-demo-${Math.random().toString(36).slice(2, 9)}`;
    const simulatedUser: User = {
      id: userId,
      app_metadata: { provider: cleanEmail.endsWith('@gmail.com') ? 'google_gmail' : 'email_verified' },
      user_metadata: {
        full_name: metadata?.full_name || cleanEmail.split('@')[0].toUpperCase(),
        tier: 'QUANT_PRO',
        firm: metadata?.firm || 'Supernova Trading Enclave',
        role: metadata?.role || 'trader',
        email_verified: true,
      },
      aud: 'authenticated',
      confirmation_sent_at: new Date().toISOString(),
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

    const jwtToken = createEnclaveJwt(userId, cleanEmail, 86400);
    const simulatedSession: Session = {
      access_token: jwtToken,
      token_type: 'bearer',
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      refresh_token: `snv_refresh_${Date.now()}`,
      user: simulatedUser,
    };

    lastLoggedInUserIdRef.current = simulatedUser.id;
    addLocalRegisteredEmail(cleanEmail);
    setUser(simulatedUser);
    setSession(simulatedSession);
    localStorage.setItem(
      LOCAL_STORAGE_SESSION_KEY,
      JSON.stringify({ session: simulatedSession, user: simulatedUser })
    );

    await logAuthEvent(
      'SIGN_IN',
      {
        email: cleanEmail,
        user_id: simulatedUser.id,
        provider: cleanEmail.endsWith('@gmail.com') ? 'gmail_confirmed' : 'email_confirmed',
      },
      'SUCCESS'
    );

    setLoading(false);
    return { error: null };
  };

  // Resend Gmail / Email Confirmation Code
  const resendEmailConfirmation = async (
    email: string,
    fullName?: string
  ): Promise<{ error: Error | null; confirmationCode?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { error: new Error('Valid email address is required.') };
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail,
        });
      } catch {
        // Fallback to backend code generator
      }
    }

    try {
      const resp = await fetch('/api/auth/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, fullName }),
      });
      if (resp.ok) {
        const data = await resp.json();
        return { error: null, confirmationCode: data.confirmation_code };
      }
    } catch {
      // Fallback
    }

    return { error: new Error('Failed to resend confirmation code.') };
  };

  // Continue with Google / Gmail confirmation flow
  const signInWithGoogle = async (
    gmailAddress?: string
  ): Promise<{
    error: Error | null;
    needsConfirmation?: boolean;
    email?: string;
    confirmationCode?: string;
  }> => {
    const cleanGmail = (gmailAddress || '').trim().toLowerCase();

    if (isSupabaseConfigured && !cleanGmail) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/macro-intel`,
          },
        });
        if (!error) {
          return { error: null };
        }
      } catch {
        // Fallback to Gmail confirmation flow
      }
    }

    if (!cleanGmail || !cleanGmail.includes('@')) {
      return {
        error: new Error('Please enter your Gmail address to receive a confirmation code.'),
      };
    }

    const res = await resendEmailConfirmation(cleanGmail);
    if (res.error) {
      return { error: res.error };
    }

    return {
      error: null,
      needsConfirmation: true,
      email: cleanGmail,
      confirmationCode: res.confirmationCode,
    };
  };

  // Sign Out handler - strictly await user_activity_logs / auth_activity_logs insert BEFORE calling supabase.auth.signOut()
  const signOut = async () => {
    setLoading(true);
    const activeUser = userRef.current || user;
    const activeEmail = activeUser?.email;
    const activeUserId = activeUser?.id;

    // 1. Complete activity log insert while JWT session is still active
    if (activeUser && activeEmail) {
      try {
        await logAuthEvent(
          'SIGN_OUT',
          {
            email: activeEmail,
            user_id: activeUserId,
            reason: 'user_action',
            forceLog: true,
          },
          'SUCCESS'
        );
      } catch (e) {
        console.warn('[Auth] Sign out audit log warning:', e);
      }
    }

    // 2. Execute supabase.auth.signOut() AFTER activity log insert completes
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
        checkEmailExists,
        signIn,
        signUp,
        verifyEmailConfirmation,
        resendEmailConfirmation,
        signInWithGoogle,
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
