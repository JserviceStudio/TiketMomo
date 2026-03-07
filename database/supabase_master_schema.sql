-- J+SERVICE SUPABASE MASTER SCHEMA
-- FINAL COMPLIANCE VERSION 8.0 (Hardened Security - 0 Issues Absolute Policy)

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Managers
create table if not exists managers (
    id text primary key,
    email text unique not null,
    api_key text unique not null,
    license_key text,
    license_type text default 'FREE',
    license_expiry_date timestamptz,
    notified_almost_expired boolean default false,
    notified_critical_expired boolean default false,
    fedapay_p_key text,
    fedapay_s_key text,
    notification_flags jsonb default '{}',
    logo_url text,
    created_at timestamptz default now()
);
alter table managers enable row level security;
create index if not exists idx_managers_email on managers(email);

-- Vouchers
create table if not exists vouchers (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    profile text not null,
    price decimal(10,2) not null,
    code text not null,
    used boolean default false,
    sale_id uuid,
    metadata jsonb default '{}',
    created_at timestamptz default now()
);
alter table vouchers enable row level security;
create index if not exists idx_vouchers_manager_id on vouchers(manager_id);
create index if not exists idx_vouchers_sale_id on vouchers(sale_id);
create index if not exists idx_vouchers_manager_price_available on vouchers(manager_id, price) where (used = false);

-- Transactions
create table if not exists transactions (
    id text primary key,
    manager_id text references managers(id) on delete cascade,
    amount decimal(10,2) not null,
    status text not null,
    type text,
    metadata jsonb default '{}',
    created_at timestamptz default now()
);
alter table transactions enable row level security;
create index if not exists idx_transactions_manager_id on transactions(manager_id);

-- Sales
create table if not exists sales (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    amount decimal(10,2) not null,
    voucher_id uuid references vouchers(id) on delete set null,
    created_at timestamptz default now()
);
alter table sales enable row level security;
create index if not exists idx_sales_manager_id on sales(manager_id);
create index if not exists idx_sales_voucher_id on sales(voucher_id);

-- Audit Logs
create table if not exists audit_logs (
    id uuid default uuid_generate_v4() primary key,
    user_id text,
    action text not null,
    entity_type text,
    entity_id text,
    details jsonb,
    ip_address text,
    created_at timestamptz default now()
);
alter table audit_logs enable row level security;
create index if not exists idx_audit_logs_user_id on audit_logs(user_id);

-- Notifications
create table if not exists notifications (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    title text not null,
    message text not null,
    type text,
    metadata jsonb default '{}',
    is_read boolean default false,
    created_at timestamptz default now()
);
alter table notifications enable row level security;
create index if not exists idx_notifications_manager_id on notifications(manager_id);

-- System Settings
create table if not exists system_settings (
    setting_key text primary key,
    setting_value text not null,
    updated_at timestamptz default now()
);
alter table system_settings enable row level security;

-- Resellers
create table if not exists resellers (
    id text primary key,
    name text not null,
    email text unique not null,
    password text not null,
    phone text not null,
    promo_code text unique not null,
    commission_rate decimal(5,2) default 10.00,
    balance decimal(12,2) default 0.00,
    created_at timestamptz default now()
);
alter table resellers enable row level security;

-- Commission Logs
create table if not exists commission_logs (
    id uuid default uuid_generate_v4() primary key,
    reseller_id text references resellers(id) on delete cascade,
    transaction_id text references transactions(id) on delete set null,
    amount decimal(10,2) not null,
    created_at timestamptz default now()
);
alter table commission_logs enable row level security;
create index if not exists idx_commission_logs_reseller_id on commission_logs(reseller_id);

-- Payout Requests
create table if not exists payout_requests (
    id text primary key,
    reseller_id text references resellers(id) on delete cascade,
    amount decimal(10,2) not null,
    phone_number text not null,
    operator text not null,
    status text default 'PENDING',
    error_message text,
    created_at timestamptz default now()
);
alter table payout_requests enable row level security;
create index if not exists idx_payout_requests_reseller_id on payout_requests(reseller_id);

-- License Batches
create table if not exists license_batches (
    id text primary key,
    batch_name text,
    license_type text,
    quantity integer,
    generated_by text,
    created_at timestamptz default now()
);
alter table license_batches enable row level security;

-- Sales Reports
create table if not exists sales_reports (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text not null,
    report_date date not null,
    total_sales decimal(12,2) not null,
    total_transactions integer default 0,
    raw_data jsonb,
    created_at timestamptz default now()
);
alter table sales_reports enable row level security;
create index if not exists idx_sales_reports_manager_id on sales_reports(manager_id);

-- 3. FUNCTIONS & RPCs (Hardened & Isolated)

-- CRITICAL: Total Cleanup of potentially existing ghost signatures
do $$
declare
    func_record record;
begin
    for func_record in (
        select oid::regprocedure as fn_name
        from pg_proc 
        where proname in ('get_next_voucher', 'request_payout', 'refund_reseller_balance', 'get_admin_tx_stats')
          and pronamespace = 'public'::regnamespace
    ) loop
        execute 'drop function ' || func_record.fn_name || ' cascade';
    end loop;
end $$;

-- Atomic Voucher Picker
create or replace function public.get_next_voucher(m_id text, p_val numeric)
returns setof public.vouchers 
language plpgsql 
security definer 
set search_path = '' -- PINNED: No schema searching allowed for high security
as $$
begin
    return query
    update public.vouchers
    set used = true
    where id = (
        select id from public.vouchers
        where manager_id = m_id
          and price = p_val
          and used = false
        order by created_at asc
        limit 1
        for update skip locked
    )
    returning *;
end;
$$;

-- Payout Request
create or replace function public.request_payout(p_id text, p_reseller_id text, p_amount numeric, p_phone text, p_operator text)
returns void 
language plpgsql 
security definer 
set search_path = ''
as $$
begin
    update public.resellers 
    set balance = balance - p_amount 
    where id = p_reseller_id and balance >= p_amount;

    if not found then
        raise exception 'Insufficent balance';
    end if;

    insert into public.payout_requests (id, reseller_id, amount, phone_number, operator, status)
    values (p_id, p_reseller_id, p_amount, p_phone, p_operator, 'PENDING');
end;
$$;

-- 4. RLS POLICIES (Optimized & Purged)

do $$
declare
    pol record;
begin
    for pol in (select policyname, tablename from pg_policies where schemaname = 'public') loop
        execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
    end loop;
end $$;

-- Policies optimized with (select auth.uid()) pattern
create policy "Managers Policy" on managers for select using ( (select auth.uid())::text = id );
create policy "Vouchers Policy" on vouchers for all using ( (select auth.uid())::text = manager_id );
create policy "Transactions Policy" on transactions for select using ( (select auth.uid())::text = manager_id );
create policy "Sales Policy" on sales for select using ( (select auth.uid())::text = manager_id );
create policy "Notifications Policy" on notifications for all using ( (select auth.uid())::text = manager_id );
create policy "Resellers Policy" on resellers for select using ( (select auth.uid())::text = id );
create policy "Commissions Policy" on commission_logs for select using ( (select auth.uid())::text = reseller_id );
create policy "Payouts Policy" on payout_requests for select using ( (select auth.uid())::text = reseller_id );
create policy "Settings Policy" on system_settings for select using ( true );
create policy "Batches Policy" on license_batches for select using ( true );
create policy "Reports Policy" on sales_reports for all using ( (select auth.uid())::text = manager_id );

-- 5. REALTIME

do $$
begin
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        create publication supabase_realtime;
    end if;
end $$;

-- 6. STORAGE

insert into storage.buckets (id, name, public) values ('manager-assets', 'manager-assets', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('reports-pdf', 'reports-pdf', false) on conflict (id) do nothing;

drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects for select using (bucket_id = 'manager-assets');

drop policy if exists "Manager Upload" on storage.objects;
create policy "Manager Upload" on storage.objects for insert with check (bucket_id = 'manager-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 7. TRIGGERS

create or replace function public.notify_low_stock() 
returns trigger 
language plpgsql 
security definer 
set search_path = ''
as $$
declare
    stock_count int;
begin
    select count(*) into stock_count 
    from public.vouchers 
    where manager_id = NEW.manager_id and profile = NEW.profile and used = false;
    
    if stock_count < 10 then
        insert into public.notifications (manager_id, title, message, type, metadata)
        values (NEW.manager_id, '⚠️ Stock Faible', 'Plus que ' || stock_count || ' tickets (' || NEW.profile || ').', 'LOW_STOCK', jsonb_build_object('profile', NEW.profile, 'stock', stock_count));
    end if;
    return NEW;
end;
$$;

drop trigger if exists tr_check_low_stock on vouchers;
create trigger tr_check_low_stock 
    after update of used on vouchers 
    for each row 
    when (OLD.used = false and NEW.used = true) 
    execute function public.notify_low_stock();

-- 8. ANALYTIC VIEWS (Security Invoker)

drop view if exists manager_sales_summary;
create view manager_sales_summary 
with (security_invoker = true)
as 
select 
    manager_id, 
    date(created_at) as sale_date, 
    count(*) as tickets_sold, 
    sum(amount) as total_revenue 
from public.sales 
group by manager_id, date(created_at);

drop view if exists reseller_performance_summary;
create view reseller_performance_summary 
with (security_invoker = true)
as 
select 
    r.id, 
    r.name, 
    r.promo_code, 
    r.balance as current_balance, 
    count(c.id) as total_commissions_count, 
    coalesce(sum(c.amount), 0) as total_earned 
from public.resellers r 
left join public.commission_logs c on r.id = c.reseller_id 
group by r.id, r.name, r.promo_code, r.balance;
