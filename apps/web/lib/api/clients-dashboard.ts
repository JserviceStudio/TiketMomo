import { apiFetch } from '@/lib/api/client';
import type { ClientDashboard } from '@/lib/api/types';

export function fetchClientDashboard() {
  return apiFetch<{ success: true; data: ClientDashboard }>('/api/v1/clients/dashboard');
}
