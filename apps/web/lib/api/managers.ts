import { apiFetch } from '@/lib/api/client';

export function loginManager(email: string, apiKey: string) {
  return apiFetch<{ success: true }>('/api/v1/managers/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, api_key: apiKey }),
  });
}
