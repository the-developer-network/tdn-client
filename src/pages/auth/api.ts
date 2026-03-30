const BASE_URL = 'https://api.developernetwork.net/api/v1';

// Using 'unknown' instead of 'any' for strict ESLint rules
export interface ApiResponse<T = unknown> {
  data: T;
  meta: {
    timestamp: string;
  };
}

export async function checkUserExists(identifier: string): Promise<boolean> {
  try {
    // Mock logic until backend implements /auth/check
    return !identifier.includes('@');
  } catch {
    // Removed unused (err) parameter
    return false; 
  }
}

export async function loginApi(identifier: string, password: string): Promise<ApiResponse<{ accessToken: string }>> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Login failed. Please check your credentials.');
  }
  return res.json();
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

export async function verifyEmailApi(otp: string): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export function initiateOAuth(provider: 'google' | 'github'): void {
  window.location.href = `${BASE_URL}/oauth/${provider}`;
}