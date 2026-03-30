import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      localStorage.setItem('access_token', token);
      
      navigate('/', { replace: true });
    } else {
      navigate('/home', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
        <p className="text-white/40 font-medium animate-pulse text-sm">Synchronizing account...</p>
      </div>
    </div>
  );
}