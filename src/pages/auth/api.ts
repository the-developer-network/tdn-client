const BASE_URL = 'https://api.developernetwork.net/api/v1';

export interface ApiResponse<T = unknown> {
  data: T;
  meta: {
    timestamp: string;
  };
}

export async function checkUserExists(identifier: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/check`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    })
    
    if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Check failed.');
  }

    const data = await res.json();
   
    return data.data.check;
  } catch {
    return false; 
  }
}

export async function loginApi(identifier: string, password: string): Promise<ApiResponse<{ accessToken: string, user: { isEmailVerified: boolean }  }>> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Login failed. Please check your credentials.');
  }

  const data = await res.json();

  return data
}

export async function registerApi(email: string, username: string, password: string): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Registration failed.');
  }
  
  return res.json();
}

export async function sendVerificationEmail(email: string) {
  const token = localStorage.getItem('access_token');

  const res = await fetch(`${BASE_URL}/auth/send-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Send verification failed.');
  }

  return res.json();
}

export async function verifyEmailApi(otp: string): Promise<ApiResponse> {
   const token = localStorage.getItem('access_token');

  const res = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ otp }), 
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Invalid verification code.');
  }
  return res.json();
}

export async function forgotPasswordApi(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to send reset link.');
  }
}

export async function resetPasswordApi(email: string, otp: string, newPassword: string) {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to reset password.');
  }

  return res.json();
}

export function initiateOAuth(provider: 'google' | 'github'): void {
  window.location.href = `${BASE_URL}/oauth/${provider}`;
}