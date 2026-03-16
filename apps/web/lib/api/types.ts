export type AdminStats = {
  stats: {
    clients: number;
    managers: number;
    tx: number;
    volume: number;
    active_clients: number;
    active: number;
  };
  charts: {
    revenue: Array<{ date: string; total: number | string }>;
    plans: Array<Record<string, unknown>>;
    transactions: Array<{ date: string; total: number | string }>;
    licenses: Array<{ date: string; total: number | string }>;
    payouts: Array<{ date: string; total: number | string }>;
  };
  lowStock: Array<{
    manager_id?: string;
    email?: string;
    stock?: number;
  }>;
  lowStockClients?: Array<{
    manager_id?: string;
    email?: string;
    stock?: number;
  }>;
  licenses: Array<{
    id: string;
    plan_code?: string;
    status?: string;
    created_at?: string;
    expires_at?: string;
    email?: string;
    amount?: number;
    client_id?: string;
  }>;
  batches: Array<{
    id: string;
    batch_name?: string;
    license_type?: string;
    quantity?: number;
    created_at?: string;
  }>;
  marketing: {
    totalCommissions: number;
    totalResellers: number;
    payoutBreakdown: {
      pending: number;
      success: number;
      failed: number;
    };
    topResellers: Array<{
      id: string;
      name?: string;
      email?: string;
      balance?: number;
      sales_count?: number;
      promo_code?: string;
      commission_volume?: number;
      health?: string;
    }>;
    payouts: Array<{
      id: string;
      amount?: number;
      status?: string;
      payout_status?: string;
      phone_number?: string;
      operator?: string;
      error_message?: string | null;
      reseller_name?: string;
      created_at?: string;
    }>;
  };
  auditLogs: Array<{
    id?: string;
    action?: string;
    target_type?: string;
    created_at?: string;
    metadata?: Record<string, unknown>;
  }>;
  config: Record<string, unknown>;
};

export type AdminAccountManager = {
  id: string;
  email: string;
  display_name?: string | null;
  status?: string;
  license_type?: string | null;
  created_at?: string;
};

export type AdminAccountClient = AdminAccountManager;

export type AdminAccountReseller = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  promo_code?: string;
  commission_rate?: number;
  balance?: number;
  created_at?: string;
};

export type AdminAccounts = {
  clients?: AdminAccountClient[];
  managers: AdminAccountManager[];
  resellers: AdminAccountReseller[];
};

export type AdminWorkspaceAccounts = {
  clients: AdminAccountClient[];
  resellers: AdminAccountReseller[];
};

export type ClientDashboard = {
  client: {
    id: string;
    email: string;
    display_name?: string | null;
    status?: string;
    license_type?: string | null;
    license_key?: string | null;
    license_expiry_date?: string | null;
    license_status?: {
      state: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY' | 'INVALID_DATE';
      label: string;
      severity: 'success' | 'warning' | 'danger' | 'neutral';
      days_remaining: number | null;
    };
  };
  inventory: {
    total: number;
    available: number;
    used: number;
    profiles: Array<{
      profile: string;
      total: number;
      available: number;
      used: number;
    }>;
    alerts: {
      low_stock: boolean;
      low_stock_threshold: number;
      critical_profiles: Array<{
        profile: string;
        total: number;
        available: number;
        used: number;
      }>;
    };
  };
  vouchers: Array<{
    id: string;
    profile: string;
    price: number;
    code: string;
    used: boolean;
    site_id?: string | null;
    sale_id?: string | null;
    password?: string;
    duration_minutes?: number;
    created_at?: string;
  }>;
  sync_jobs: Array<{
    id: string;
    job_type: string;
    status: string;
    attempt_count: number;
    last_error?: string | null;
    source: string;
    batch_size: number;
    inserted: number;
    ignored: number;
    site_id?: string | null;
    processed_at?: string;
    created_at?: string;
  }>;
  sync_summary: {
    source: string;
    last_status: string;
    last_received_at?: string | null;
    last_batch_size: number;
    last_inserted: number;
    last_error?: string | null;
  };
};

export type ResellerDashboard = {
  reseller: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    promo_code: string;
    balance: number;
    commission_rate?: number;
  };
  partner?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    promo_code: string;
    balance: number;
    commission_rate?: number;
  };
  summary?: {
    total_commissions: number;
    sales_count: number;
    pending_payouts: number;
    successful_payouts: number;
    commissions_last_7d: number;
    commissions_this_month: number;
    sales_last_7d: number;
    sales_this_month: number;
    average_commission: number;
    payout_breakdown: {
      pending: number;
      success: number;
      failed: number;
    };
  };
  sales: Array<{
    id: string;
    commission_id?: string | null;
    transaction_id?: string | null;
    reference: string;
    amount: number;
    sale_date?: string;
    commission_date?: string;
    transaction_status?: string;
    transaction_type?: string | null;
    sale_kind: 'LICENSE' | 'PROMO' | 'VOUCHER' | 'SALE';
    source_system?: string | null;
    manager_id?: string | null;
    app_id?: string | null;
    license?: {
      id: string;
      plan_code?: string | null;
      status?: string | null;
      expires_at?: string | null;
    } | null;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    phone_number?: string;
    operator?: string;
    status?: string;
    payout_status?: 'PENDING' | 'SUCCESS' | 'FAILED';
    error_message?: string | null;
    created_at?: string;
    updated_at?: string;
  }>;
  activity?: Array<{
    id: string;
    event_type: 'SALE' | 'PAYOUT';
    date?: string;
    amount: number;
    status?: string;
    title: string;
    reference: string;
  }>;
};

export type PartnerDashboard = ResellerDashboard;
