import { apiFetch } from '@/lib/api/client';
import type {
  AdminAccountClient,
  AdminAccountManager,
  AdminAccountReseller,
  AdminAccounts,
  AdminWorkspaceAccounts,
  AdminStats,
} from '@/lib/api/types';

export function fetchAdminStats() {
  return apiFetch<AdminStats>('/admin/api/stats');
}

export async function fetchAdminAccounts() {
  const response = await apiFetch<{ success: true; data: AdminAccounts }>('/admin/api/accounts');
  return response.data;
}

export async function fetchAdminWorkspaceAccounts(): Promise<AdminWorkspaceAccounts> {
  const data = await fetchAdminAccounts();
  return {
    clients: data.clients ?? data.managers,
    resellers: data.resellers,
  };
}

export async function createAdminManager(payload: {
  email: string;
  displayName?: string;
  licenseKey?: string;
}) {
  const response = await apiFetch<{ success: true; data: AdminAccountManager }>(
    '/admin/api/accounts/managers',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function createAdminClient(payload: {
  email: string;
  displayName?: string;
  licenseKey?: string;
}): Promise<AdminAccountClient> {
  const response = await apiFetch<{ success: true; data: AdminAccountClient }>(
    '/admin/api/accounts/clients',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function updateAdminManagerStatus(managerId: string, status: string) {
  const response = await apiFetch<{ success: true; data: { id: string; status: string } }>(
    `/admin/api/accounts/managers/${managerId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );

  return response.data;
}

export async function updateAdminClientStatus(clientId: string, status: string) {
  const response = await apiFetch<{ success: true; data: { id: string; status: string } }>(
    `/admin/api/accounts/clients/${clientId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );

  return response.data;
}

export async function createAdminReseller(payload: {
  name: string;
  email: string;
  password: string;
  phone: string;
  promoCode?: string;
  commissionRate?: number;
}) {
  const response = await apiFetch<{ success: true; data: AdminAccountReseller }>(
    '/admin/api/accounts/resellers',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export function loginAdmin(username: string, password: string) {
  return apiFetch<{ success: true }>('/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
