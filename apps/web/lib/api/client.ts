import { API_BASE_URL } from '@/lib/config';

type FetchOptions = RequestInit & {
  baseUrl?: string;
};

export async function apiFetch<T>(
  path: string,
  { baseUrl = API_BASE_URL, headers, ...init }: FetchOptions = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ error: { message: 'Erreur inconnue.' } }));
    throw Object.assign(new Error(payload?.error?.message || 'Request failed'), {
      status: response.status,
      payload,
    });
  }

  return (await response.json()) as T;
}
