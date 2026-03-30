import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import {
  checkUserExists,
  loginApi,
  registerApi,
  verifyEmailApi,
  forgotPasswordApi,
  sendVerificationEmail,
  resetPasswordApi,
} from './api';
import type { AuthStep } from './types';
import InitialStep from './steps/InitialStep';
import LoginStep from './steps/LoginStep';
import RegisterUsernameStep from './steps/RegisterUsernameStep';
import RegisterPasswordStep from './steps/RegisterPasswordStep';
import RegisterOtpStep from './steps/RegisterOtpStep';
import VerifyEmailStep from './steps/VerifyEmailStep';
import ForgotPasswordStep from './steps/ForgotPasswordStep';
import ResetPasswordStep from './steps/ResetPasswordStep';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const navigate = useNavigate();

  const [step, setStep]               = useState<AuthStep>('INITIAL');
  const [identifier, setIdentifier]   = useState('');
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [otp, setOtp]                 = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

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
        setNewPassword('');
        setErrorMsg('');
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => { setErrorMsg(''); }, [identifier, username, password, otp]);

  // Auth başarılı → modal kapat + feed'e git
  const handleSuccess = () => {
    console.log('[AuthModal] Auth successful, navigating to feed');
    onClose();
    navigate('/');
  };

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
        localStorage.setItem('access_token', res.data.accessToken);
        console.log('[AuthModal] Token saved, isEmailVerified:', res.data.user?.isEmailVerified);

        if (res.data.user?.isEmailVerified === false) {
          await sendVerificationEmail(identifier);
          setStep('VERIFY_EMAIL');
        } else {
          handleSuccess();
        }
      }
    } catch (error) {
      console.error('[AuthModal] loginApi error:', error);
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
      
      const loginRes = await loginApi(identifier, password);

      if (loginRes.data?.accessToken) {
  
        localStorage.setItem('access_token', loginRes.data.accessToken);
      
        setStep('REGISTER_OTP');
    }
    } catch (error) {
      console.error('[AuthModal] registerApi error:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 8) { setErrorMsg('OTP must be exactly 8 digits.'); return; }
    setIsLoading(true);
    try {
      const res = await verifyEmailApi(otp);
      console.log('[AuthModal] verifyEmailApi response:', res);
      handleSuccess();
    } catch (error) {
      console.error('[AuthModal] verifyEmailApi error:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier.includes('@')) { setErrorMsg('Please enter a valid email address.'); return; }
    setIsLoading(true);
    try {
      await forgotPasswordApi(identifier);
      setStep('RESET_PASSWORD');
    } catch (error) {
      console.error('[AuthModal] forgotPasswordApi error:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (otp.length !== 8)  { setErrorMsg('OTP must be exactly 8 digits.'); return; }
    if (!newPassword)       { setErrorMsg('Please enter a new password.'); return; }
    setIsLoading(true);
    try {
      await resetPasswordApi(identifier, otp, newPassword);
      console.log('[AuthModal] resetPasswordApi success');
      setStep('INITIAL');
    } catch (error) {
      console.error('[AuthModal] resetPasswordApi error:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] w-full max-w-[420px] rounded-2xl border border-white/10 shadow-2xl relative flex flex-col p-8">

        <button onClick={onClose} disabled={isLoading} className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step !== 'INITIAL' && (
          <button onClick={() => setStep('INITIAL')} disabled={isLoading} className="absolute top-5 left-5 text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
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

        {step === 'INITIAL'            && <InitialStep identifier={identifier} isLoading={isLoading} onChange={setIdentifier} onSubmit={handleIdentifierSubmit} />}
        {step === 'LOGIN'              && <LoginStep identifier={identifier} password={password} isLoading={isLoading} onChange={setPassword} onSubmit={handleLogin} onForgotPassword={() => setStep('FORGOT_PASSWORD')} />}
        {step === 'REGISTER_USERNAME'  && <RegisterUsernameStep identifier={identifier} username={username} isLoading={isLoading} onChange={setUsername} onNext={() => setStep('REGISTER_PASSWORD')} />}
        {step === 'REGISTER_PASSWORD'  && <RegisterPasswordStep username={username} password={password} isLoading={isLoading} onChange={setPassword} onSubmit={handleRegisterFlow} />}
        {step === 'REGISTER_OTP'       && <RegisterOtpStep identifier={identifier} otp={otp} isLoading={isLoading} onChange={setOtp} onSubmit={handleVerifyOtp} onSkip={handleSuccess} />}
        {step === 'VERIFY_EMAIL'       && <VerifyEmailStep identifier={identifier} otp={otp} isLoading={isLoading} onChange={setOtp} onSubmit={handleVerifyOtp} onSkip={handleSuccess} />}
        {step === 'FORGOT_PASSWORD'    && <ForgotPasswordStep identifier={identifier} isLoading={isLoading} onChange={setIdentifier} onSubmit={handleForgotPassword} />}
        {step === 'RESET_PASSWORD'     && <ResetPasswordStep identifier={identifier} otp={otp} newPassword={newPassword} isLoading={isLoading} onOtpChange={setOtp} onPasswordChange={setNewPassword} onSubmit={handleResetPassword} />}
      </div>
    </div>
  );
}