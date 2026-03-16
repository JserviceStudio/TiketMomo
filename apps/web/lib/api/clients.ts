import { apiFetch } from '@/lib/api/client';

export function loginClient(email: string, apiKey: string) {
  return apiFetch<{ success: true }>('/api/v1/clients/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, api_key: apiKey }),
  });
}
