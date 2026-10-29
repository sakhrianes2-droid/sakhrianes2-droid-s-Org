import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Mail,
  KeyRound,
  User as UserIcon,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

export default function LoginPage() {
  const {
    isConfigured,
    signIn,
    signUp,
    verifyEmailConfirmation,
    resendEmailConfirmation,
    signInWithGoogle,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  // Gmail / Email Confirmation State
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [confirmationCodeInput, setConfirmationCodeInput] = useState('');
  const [previewConfirmationCode, setPreviewConfirmationCode] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const completeRedirect = () => {
    setAuthSuccess(true);
    setTimeout(() => {
      const dest = (location.state as any)?.from?.pathname || '/macro-intel';
      navigate(dest);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'login') {
      if (isConfigured && !password.trim()) {
        setErrorMsg('Please enter your password.');
        return;
      }

      const effectivePass = password || (!isConfigured ? 'quant-pass-2026' : '');
      setIsSubmitting(true);
      const { error } = await signIn(targetEmail, effectivePass);
      setIsSubmitting(false);

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password.');
      } else {
        completeRedirect();
      }
    } else {
      if (isConfigured && password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }

      const effectivePass = password || (!isConfigured ? 'quant-pass-2026' : '');
      setIsSubmitting(true);
      const result = await signUp(targetEmail, effectivePass, {
        full_name: fullName.trim() || undefined,
      });
      setIsSubmitting(false);

      if (result.error) {
        setErrorMsg(result.error.message || 'Could not create account.');
      } else if (result.needsEmailConfirmation) {
        setPreviewConfirmationCode(result.confirmationCode || null);
        setConfirmationCodeInput('');
        setEmailConfirmationSent(true);
      } else {
        completeRedirect();
      }
    }
  };

  const handleGoogleConfirmation = async () => {
    setErrorMsg(null);
    setInfoMsg(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
      setErrorMsg('Enter your Gmail address above, then click Confirm with Gmail.');
      return;
    }

    setIsSubmitting(true);
    const result = await signInWithGoogle(targetEmail);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMsg(result.error.message);
    } else if (result.needsConfirmation) {
      setPreviewConfirmationCode(result.confirmationCode || null);
      setConfirmationCodeInput('');
      setEmailConfirmationSent(true);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanCode = confirmationCodeInput.trim();
    if (cleanCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit confirmation code.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await verifyEmailConfirmation(email, cleanCode, {
      full_name: fullName.trim() || undefined,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Invalid confirmation code.');
    } else {
      completeRedirect();
    }
  };

  const handleResendCode = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsResending(true);
    const result = await resendEmailConfirmation(email, fullName.trim() || undefined);
    setIsResending(false);

    if (result.error) {
      setErrorMsg(result.error.message);
    } else {
      if (result.confirmationCode) {
        setPreviewConfirmationCode(result.confirmationCode);
      }
      setInfoMsg('A new 6-digit confirmation code has been sent.');
    }
  };

  const isGmail = email.trim().toLowerCase().endsWith('@gmail.com');

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-zinc-100 flex flex-col justify-between p-6 font-sans">
      {/* Minimal Top Navigation */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Supernova
        </Link>
      </header>

      {/* Centered Log In / Sign Up / Gmail Confirmation Card */}
      <main className="w-full max-w-sm mx-auto my-auto py-12">
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
          {authSuccess ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h1 className="text-lg font-semibold text-white">
                {emailConfirmationSent ? 'Gmail confirmed' : mode === 'login' ? 'Logged in' : 'Account created'}
              </h1>
              <p className="text-sm text-zinc-400">Redirecting to your workspace...</p>
            </div>
          ) : emailConfirmationSent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
                  <GoogleIcon />
                  <span>{isGmail ? 'Gmail Confirmation' : 'Email Confirmation'}</span>
                </div>
                <a
                  href="https://mail.google.com/mail/u/0/#inbox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <span>Open Gmail</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  Confirm your {isGmail ? 'Gmail' : 'email'}
                </h1>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                  Enter the 6-digit verification code sent to{' '}
                  <span className="text-white font-medium break-all">{email}</span>.
                </p>
              </div>

              {previewConfirmationCode && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between gap-2">
                  <div className="text-xs text-emerald-200">
                    <span className="text-emerald-400 font-medium block">Verification code ready</span>
                    Code: <span className="font-mono font-bold text-white tracking-wider">{previewConfirmationCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmationCodeInput(previewConfirmationCode)}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded text-xs font-medium text-emerald-200 transition-colors cursor-pointer shrink-0"
                  >
                    Fill Code
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 text-xs">
                  {infoMsg}
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="confirmation-code" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    6-digit confirmation code
                  </label>
                  <input
                    id="confirmation-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmationCodeInput}
                    onChange={(e) => setConfirmationCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-center font-mono text-lg tracking-[0.35em] text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || confirmationCodeInput.length !== 6}
                  className="w-full py-2.5 px-4 bg-[#bffe1c] hover:bg-[#aee619] text-zinc-950 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verifying...' : 'Verify & Continue'}</span>
                </button>
              </form>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? 'Sending...' : 'Resend code'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailConfirmationSent(false);
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Change email
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="mb-5">
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  {mode === 'login' ? 'Log in to your account' : 'Create an account'}
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  {mode === 'login'
                    ? 'Enter your email and password to sign in.'
                    : 'Sign up and confirm your Gmail to get started.'}
                </p>
              </div>

              {/* Clean Log In / Sign Up Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    mode === 'signup'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="login-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Full name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="login-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Email or Gmail address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@gmail.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'login' ? 'Enter your password' : 'Create a password (min. 6 chars)'}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                      required={isConfigured}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#bffe1c] hover:bg-[#aee619] text-zinc-950 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <span>
                    {isSubmitting
                      ? mode === 'login'
                        ? 'Logging in...'
                        : 'Sending confirmation...'
                      : mode === 'login'
                        ? 'Log In'
                        : 'Sign Up & Confirm Gmail'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-zinc-800"></div>
                  <span className="flex-shrink mx-3 text-[11px] text-zinc-500">or</span>
                  <div className="flex-grow border-t border-zinc-800"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleConfirmation}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <GoogleIcon />
                  <span>Confirm with Gmail Code</span>
                </button>

                <div className="pt-2 text-center text-xs text-zinc-400">
                  {mode === 'login' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setErrorMsg(null);
                        }}
                        className="text-white font-medium hover:underline cursor-pointer"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setErrorMsg(null);
                        }}
                        className="text-white font-medium hover:underline cursor-pointer"
                      >
                        Log in
                      </button>
                    </>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-zinc-600">
        Supernova AI Trading System
      </footer>
    </div>
  );
}
