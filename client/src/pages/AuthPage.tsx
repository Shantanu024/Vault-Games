import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Loader2, Sparkles, RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../config/api';
import { useAuthStore } from '../store/authStore';

type Tab = 'register' | 'login' | 'otp';

export default function AuthPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('register');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // OTP flow
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated]);

  // Pre-fill suggested username
  useEffect(() => {
    if (tab === 'register') {
      api.get('/auth/suggest-username')
        .then((r) => setRegUsername(r.data.username))
        .catch(() => {});
    }
  }, [tab]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const refreshUsername = async () => {
    try {
      const r = await api.get('/auth/suggest-username');
      setRegUsername(r.data.username);
    } catch {}
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: regUsername,
        email: regEmail,
        password: regPassword,
      });
      setAuth(res.data.user, res.data.accessToken);
      toast.success('Welcome to VaultGames!');
      navigate('/');
    } catch (err: any) {
      // Handle validation errors array
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessage = err.response.data.errors
          .map((e: any) => e.msg)
          .join('\n');
        toast.error(errorMessage);
      } else {
        toast.error(err.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        username: loginUsername,
        password: loginPassword,
      });
      setAuth(res.data.user, res.data.accessToken);
      toast.success(`Welcome back, ${res.data.user.username}!`);
      navigate('/');
    } catch (err: any) {
      // Handle validation errors array
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessage = err.response.data.errors
          .map((e: any) => e.msg)
          .join('\n');
        toast.error(errorMessage);
      } else {
        toast.error(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail) return;
    setLoading(true);
    try {
      await api.post('/auth/request-otp', { email: otpEmail });
      setOtpSent(true);
      setOtpTimer(60);
      toast.success('OTP sent to your email');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email: otpEmail, otp: otpCode });
      setAuth(res.data.user, res.data.accessToken);
      toast.success('Verified successfully!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg-deep grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vault-violet/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-vault-blue/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-vault-violet flex items-center justify-center shadow-glow-sm">
              <span className="text-white text-lg font-display font-bold">V</span>
            </div>
            <span className="text-2xl font-display font-bold text-vault-text-primary tracking-tight">
              VaultGames
            </span>
          </div>
          <p className="text-vault-text-muted text-sm">Your exclusive gaming arena</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl overflow-hidden shadow-card">
          {/* Tabs */}
          <div className="flex border-b border-vault-border">
            {(['register', 'login', 'otp'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-medium transition-all ${
                  tab === t
                    ? 'text-vault-glow border-b-2 border-vault-violet bg-vault-violet/5'
                    : 'text-vault-text-muted hover:text-vault-text-secondary'
                }`}
              >
                {t === 'register' ? 'Register' : t === 'login' ? 'Sign In' : 'OTP Login'}
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* ── REGISTER ── */}
              {tab === 'register' && (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                      Username
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Choose a username"
                        required
                        minLength={3}
                        maxLength={20}
                        pattern="^[a-zA-Z0-9_]+$"
                        className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-10 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                      />
                      <button
                        type="button"
                        onClick={refreshUsername}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text-muted hover:text-vault-glow transition-colors"
                        title="Generate new username"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-vault-text-muted mt-1">
                      Pre-filled randomly — edit freely
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        required
                        minLength={8}
                        className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-10 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text-muted hover:text-vault-glow transition-colors"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    
                    {/* Password Requirements Checklist */}
                    {regPassword && (
                      <div className="text-xs space-y-1 mt-2 p-2 bg-vault-bg-deep border border-vault-border/50 rounded-lg">
                        <div className={regPassword.length >= 8 ? 'text-green-400' : 'text-red-400'}>
                          {regPassword.length >= 8 ? '✓' : '✗'} At least 8 characters
                        </div>
                        <div className={/[a-z]/.test(regPassword) ? 'text-green-400' : 'text-red-400'}>
                          {/[a-z]/.test(regPassword) ? '✓' : '✗'} One lowercase letter (a-z)
                        </div>
                        <div className={/[A-Z]/.test(regPassword) ? 'text-green-400' : 'text-red-400'}>
                          {/[A-Z]/.test(regPassword) ? '✓' : '✗'} One uppercase letter (A-Z)
                        </div>
                        <div className={/\d/.test(regPassword) ? 'text-green-400' : 'text-red-400'}>
                          {/\d/.test(regPassword) ? '✓' : '✗'} One number (0-9)
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-vault-violet hover:bg-vault-violet-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow-sm hover:shadow-glow-md mt-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                </motion.form>
              )}

              {/* ── LOGIN ── */}
              {tab === 'login' && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                      Username or Email
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="Enter your username or email"
                        required
                        className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Your password"
                        required
                        className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-10 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text-muted hover:text-vault-glow transition-colors"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setTab('otp')}
                      className="text-xs text-vault-violet hover:text-vault-glow transition-colors"
                    >
                      Forgot password? Use OTP login
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-vault-violet hover:bg-vault-violet-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow-sm hover:shadow-glow-md"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </motion.form>
              )}

              {/* ── OTP ── */}
              {tab === 'otp' && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-vault-text-secondary">
                    Enter your registered email and we'll send a one-time code.
                  </p>

                  {/* Step 1: request OTP */}
                  <form onSubmit={handleRequestOTP} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                        Email
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                        <input
                          type="email"
                          value={otpEmail}
                          onChange={(e) => { setOtpEmail(e.target.value); setOtpSent(false); setOtpCode(''); }}
                          placeholder="your@email.com"
                          required
                          className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || otpTimer > 0}
                      className="w-full border border-vault-violet text-vault-violet hover:bg-vault-violet hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      {otpTimer > 0 ? `Resend in ${otpTimer}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </form>

                  {/* Step 2: verify OTP */}
                  <AnimatePresence>
                    {otpSent && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        onSubmit={handleVerifyOTP}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                            Verification Code
                          </label>
                          <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit code"
                            maxLength={6}
                            required
                            className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-4 py-2.5 text-center text-2xl font-mono tracking-[0.5em] text-vault-glow placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading || otpCode.length < 6}
                          className="w-full bg-vault-violet hover:bg-vault-violet-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow-sm"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                          {loading ? 'Verifying…' : 'Verify & Sign In'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-xs text-vault-text-muted mt-4">
          By joining, you agree to fair play and our terms of service.
        </p>
      </motion.div>
    </div>
  );
}
