import { useEffect, useState } from 'react';
import logo from '../../../assets/logo.png';
import { 
  checkUserExists, 
  loginApi, 
  registerApi, 
  verifyEmailApi, 
  forgotPasswordApi, 
  initiateOAuth 
} from '../api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthStep = 'INITIAL' | 'LOGIN' | 'REGISTER_USERNAME' | 'REGISTER_PASSWORD' | 'REGISTER_OTP' | 'FORGOT_PASSWORD';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('INITIAL');
  
  const [identifier, setIdentifier] = useState(''); 
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('INITIAL');
        setIdentifier('');
        setUsername('');
        setPassword('');
        setOtp('');
        setErrorMsg('');
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => { setErrorMsg(''); }, [identifier, username, password, otp]);

  const handleIdentifierSubmit = async () => {
    if (!identifier) return;
    setIsLoading(true);
    try {
      const exists = await checkUserExists(identifier);
      if (exists) {
        setStep('LOGIN');
      } else {
        if (identifier.includes('@')) {
          setStep('REGISTER_USERNAME');
        } else {
          setErrorMsg('Account not found. Enter an email to register.');
        }
      }
    } catch {
      // Unused error object removed
      setErrorMsg('An error occurred while checking your account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      const res = await loginApi(identifier, password);
      if (res.data?.accessToken) {
        localStorage.setItem('tdn_token', res.data.accessToken);
        onClose();
      }
    } catch (error) {
      // Safe error extraction
      setErrorMsg(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterFlow = async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      await registerApi(identifier, username, password);
      setStep('REGISTER_OTP');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 8) {
      setErrorMsg('OTP must be exactly 8 digits.');
      return;
    }
    setIsLoading(true);
    try {
      await verifyEmailApi(otp);
      onClose(); 
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      await forgotPasswordApi(identifier);
      setStep('INITIAL'); 
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] w-full max-w-[420px] rounded-2xl border border-white/10 shadow-2xl relative flex flex-col p-8">
        
        <button onClick={onClose} disabled={isLoading} className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {step !== 'INITIAL' && (
          <button onClick={() => setStep('INITIAL')} disabled={isLoading} className="absolute top-5 left-5 text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}

        <div className="flex justify-center mb-6 mt-2">
          <div className="flex items-center gap-2">
            <img src={logo} alt="TDN Logo" className="h-6 w-auto object-contain" />
            <span className="text-white font-bold tracking-tight">TDN</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: INITIAL */}
        {step === 'INITIAL' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-serif text-white text-center mb-2">Welcome to TDN</h2>
            <p className="text-white/50 text-sm text-center mb-8">Log in or Sign up to Continue</p>

            <div className="space-y-3 mb-6">
              <button onClick={() => initiateOAuth('google')} className="w-full bg-white text-black font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Continue with Google
              </button>
              <button onClick={() => initiateOAuth('github')} className="w-full bg-white text-black font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Continue with GitHub
              </button>
            </div>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="px-3 text-white/30 text-xs uppercase tracking-widest">Or</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Email address or username" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleIdentifierSubmit()}
                className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                disabled={isLoading}
              />
              <button 
                onClick={handleIdentifierSubmit}
                disabled={isLoading || !identifier}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Checking...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LOGIN */}
        {step === 'LOGIN' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-serif text-white text-center mb-2">Welcome back</h2>
            <p className="text-white/50 text-sm text-center mb-8">{identifier}</p>

            <div className="space-y-4">
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                disabled={isLoading}
              />
              <button 
                onClick={handleLogin}
                disabled={isLoading || !password}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
            <button onClick={() => setStep('FORGOT_PASSWORD')} className="w-full text-white/50 hover:text-white text-sm mt-6 transition-colors">
              Forgot password?
            </button>
          </div>
        )}

        {/* STEP 3.A: REGISTER - USERNAME */}
        {step === 'REGISTER_USERNAME' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-serif text-white text-center mb-2">Create an account</h2>
            <p className="text-white/50 text-sm text-center mb-8">{identifier}</p>

            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Choose a username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && username && setStep('REGISTER_PASSWORD')}
                className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                disabled={isLoading}
              />
              <button 
                onClick={() => setStep('REGISTER_PASSWORD')}
                disabled={isLoading || !username}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3.B: REGISTER - PASSWORD */}
        {step === 'REGISTER_PASSWORD' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-serif text-white text-center mb-2">Secure your account</h2>
            <p className="text-white/50 text-sm text-center mb-8">@{username}</p>

            <div className="space-y-4">
              <input 
                type="password" 
                placeholder="Create a password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegisterFlow()}
                className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                disabled={isLoading}
              />
              <button 
                onClick={handleRegisterFlow}
                disabled={isLoading || !password}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REGISTER OTP */}
        {step === 'REGISTER_OTP' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-serif text-white text-center mb-2">Verify your email</h2>
            <p className="text-white/50 text-sm text-center mb-8">We sent an 8-digit code to {identifier}</p>

            <div className="space-y-4">
              <input 
                type="text" 
                maxLength={8}
                placeholder="8-digit code" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                className="w-full bg-[#121212] border border-white/10 text-white text-center tracking-[0.5em] rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                disabled={isLoading}
              />
              <button 
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 8}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <button onClick={onClose} disabled={isLoading} className="w-full text-white/50 hover:text-white text-sm mt-6 transition-colors">
              Skip for now
            </button>
          </div>
        )}

        {/* STEP 5: FORGOT PASSWORD */}
        {step === 'FORGOT_PASSWORD' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-serif text-white text-center mb-2">Reset Password</h2>
            <p className="text-white/50 text-sm text-center mb-8">Enter your email to receive a reset link.</p>

            <div className="space-y-4">
              <input 
                type="email" 
                placeholder="Email address" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                className="w-full bg-[#121212] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                disabled={isLoading}
              />
              <button 
                onClick={handleForgotPassword}
                disabled={isLoading || !identifier.includes('@')}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}