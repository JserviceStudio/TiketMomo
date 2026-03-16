-- J+SERVICE SUPABASE MASTER SCHEMA
-- PLATFORM VERSION 9.0

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Managers / tenants
create table if not exists managers (
    id text primary key,
    email text unique not null,
    display_name text,
    status text default 'ACTIVE',
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
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table managers enable row level security;
create index if not exists idx_managers_email on managers(email);

-- Product/app catalog
create table if not exists apps (
    id text primary key,
    code text unique not null,
    name text not null,
    category text default 'CORE',
    status text default 'ACTIVE',
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table apps enable row level security;

insert into apps (id, code, name, category)
values
    ('wifi-core', 'wifi', 'WiFi Ticketing', 'CORE'),
    ('license-saas', 'license', 'License SaaS', 'SAAS'),
    ('marketing-core', 'marketing', 'Marketing Platform', 'GROWTH')
on conflict (id) do nothing;

-- Which apps are enabled for each manager
create table if not exists manager_apps (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text references apps(id) on delete cascade,
    status text default 'ACTIVE',
    config jsonb default '{}',
    activated_at timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(manager_id, app_id)
);
alter table manager_apps enable row level security;
create index if not exists idx_manager_apps_manager_id on manager_apps(manager_id);

-- External identities for hybrid auth
create table if not exists auth_identities (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    provider text not null,
    provider_user_id text not null,
    email text,
    is_primary boolean default false,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(provider, provider_user_id)
);
alter table auth_identities enable row level security;
create index if not exists idx_auth_identities_manager_id on auth_identities(manager_id);

-- Sites / physical or logical app instances
create table if not exists sites (
    id text primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text references apps(id) on delete set null,
    name text not null,
    ip_address text,
    api_user text,
    api_password text,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table sites enable row level security;
create index if not exists idx_sites_manager_id on sites(manager_id);

-- Vouchers
create table if not exists vouchers (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    site_id text references sites(id) on delete set null,
    app_id text references apps(id) on delete set null,
    profile text not null,
    price decimal(10,2) not null,
    code text not null,
    used boolean default false,
    sale_id text,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(code, manager_id)
);
alter table vouchers enable row level security;
create index if not exists idx_vouchers_manager_id on vouchers(manager_id);
create index if not exists idx_vouchers_sale_id on vouchers(sale_id);
create index if not exists idx_vouchers_manager_price_available on vouchers(manager_id, price) where (used = false);

-- Transactions
create table if not exists transactions (
    id text primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text references apps(id) on delete set null,
    amount decimal(10,2) not null,
    status text not null,
    type text,
    source_system text default 'BACKEND',
    voucher_id uuid references vouchers(id) on delete set null,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table transactions enable row level security;
create index if not exists idx_transactions_manager_id on transactions(manager_id);
create index if not exists idx_transactions_app_id on transactions(app_id);

-- Materialized sale facts
create table if not exists sales (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text references apps(id) on delete set null,
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

-- Resellers / partners
create table if not exists resellers (
    id text primary key,
    name text not null,
    email text unique not null,
    password text not null,
    phone text not null,
    promo_code text unique not null,
    commission_rate decimal(5,2) default 10.00,
    balance decimal(12,2) default 0.00,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table resellers enable row level security;

create table if not exists commission_logs (
    id uuid default uuid_generate_v4() primary key,
    reseller_id text references resellers(id) on delete cascade,
    transaction_id text references transactions(id) on delete set null,
    amount decimal(10,2) not null,
    created_at timestamptz default now()
);
alter table commission_logs enable row level security;
create index if not exists idx_commission_logs_reseller_id on commission_logs(reseller_id);

create table if not exists payout_requests (
    id text primary key,
    reseller_id text references resellers(id) on delete cascade,
    amount decimal(10,2) not null,
    phone_number text not null,
    operator text not null,
    status text default 'PENDING',
    error_message text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table payout_requests enable row level security;
create index if not exists idx_payout_requests_reseller_id on payout_requests(reseller_id);

-- Admin batches
create table if not exists license_batches (
    id text primary key,
    batch_name text,
    license_type text,
    quantity integer,
    generated_by text,
    created_at timestamptz default now()
);
alter table license_batches enable row level security;

-- Legacy report submissions
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

-- Licenses / subscriptions
create table if not exists licenses (
    id text primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text references apps(id) on delete set null,
    plan_code text not null,
    status text default 'ACTIVE',
    license_key text unique not null,
    starts_at timestamptz default now(),
    expires_at timestamptz,
    source_tx_id text references transactions(id) on delete set null,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table licenses enable row level security;
create index if not exists idx_licenses_manager_id on licenses(manager_id);

create table if not exists license_entitlements (
    id uuid default uuid_generate_v4() primary key,
    license_id text references licenses(id) on delete cascade,
    feature_code text not null,
    value_json jsonb default '{}',
    created_at timestamptz default now(),
    unique(license_id, feature_code)
);
alter table license_entitlements enable row level security;

-- Operational event stream
create table if not exists operational_events (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text references apps(id) on delete set null,
    event_type text not null,
    event_payload jsonb default '{}',
    source_system text default 'BACKEND',
    created_at timestamptz default now()
);
alter table operational_events enable row level security;
create index if not exists idx_operational_events_manager_id on operational_events(manager_id);
create index if not exists idx_operational_events_app_id on operational_events(app_id);

-- Async work tracking
create table if not exists sync_jobs (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text references apps(id) on delete set null,
    job_type text not null,
    status text default 'PENDING',
    attempt_count integer default 0,
    last_error text,
    payload jsonb default '{}',
    scheduled_for timestamptz default now(),
    processed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table sync_jobs enable row level security;
create index if not exists idx_sync_jobs_status_scheduled on sync_jobs(status, scheduled_for);

-- Fast dashboard facts
create table if not exists analytics_daily_facts (
    id uuid default uuid_generate_v4() primary key,
    manager_id text references managers(id) on delete cascade,
    app_id text references apps(id) on delete set null,
    day date not null,
    sales_count integer default 0,
    revenue_total decimal(12,2) default 0,
    license_sales_count integer default 0,
    license_revenue_total decimal(12,2) default 0,
    low_stock_events integer default 0,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(manager_id, app_id, day)
);
alter table analytics_daily_facts enable row level security;
create index if not exists idx_analytics_daily_facts_manager_day on analytics_daily_facts(manager_id, day desc);

-- 3. FUNCTIONS & RPCs

do $$
declare
    func_record record;
begin
    for func_record in (
        select oid::regprocedure as fn_name
        from pg_proc
        where proname in (
            'touch_updated_at',
            'get_next_voucher',
            'request_payout',
            'refund_reseller_balance',
            'get_admin_tx_stats',
            'get_revenue_history_7d',
            'get_license_type_stats',
            'get_low_stock_managers',
            'get_total_commissions_30d',
            'notify_low_stock',
            'log_sale_from_transaction'
        )
          and pronamespace = 'public'::regnamespace
    ) loop
        execute 'drop function ' || func_record.fn_name || ' cascade';
    end loop;
end $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.get_next_voucher(m_id text, p_val numeric)
returns setof public.vouchers
language plpgsql
security definer
set search_path = ''
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
        raise exception 'Insufficient balance';
    end if;

    insert into public.payout_requests (id, reseller_id, amount, phone_number, operator, status)
    values (p_id, p_reseller_id, p_amount, p_phone, p_operator, 'PENDING');
end;
$$;

create or replace function public.refund_reseller_balance(reseller_id text, amount_to_add numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.resellers
    set balance = balance + amount_to_add
    where id = reseller_id;
end;
$$;

create or replace function public.get_admin_tx_stats()
returns table(total_tx bigint, total_volume numeric, active_managers bigint)
language sql
security definer
set search_path = ''
as $$
    select
        count(*)::bigint as total_tx,
        coalesce(sum(amount), 0)::numeric as total_volume,
        count(distinct manager_id)::bigint as active_managers
    from public.transactions
    where status = 'SUCCESS';
$$;

create or replace function public.get_revenue_history_7d()
returns table(date date, total numeric)
language sql
security definer
set search_path = ''
as $$
    select
        gs.day::date as date,
        coalesce(sum(t.amount), 0)::numeric as total
    from generate_series(current_date - interval '6 day', current_date, interval '1 day') as gs(day)
    left join public.transactions t
        on date(t.created_at) = gs.day::date
       and t.status = 'SUCCESS'
    group by gs.day
    order by gs.day asc;
$$;

create or replace function public.get_license_type_stats()
returns table(plan_code text, total bigint)
language sql
security definer
set search_path = ''
as $$
    select
        coalesce(plan_code, 'UNKNOWN') as plan_code,
        count(*)::bigint as total
    from public.licenses
    group by coalesce(plan_code, 'UNKNOWN')
    order by total desc;
$$;

create or replace function public.get_low_stock_managers()
returns table(manager_id text, email text, profile text, stock bigint)
language sql
security definer
set search_path = ''
as $$
    select
        v.manager_id,
        m.email,
        v.profile,
        count(*)::bigint as stock
    from public.vouchers v
    join public.managers m on m.id = v.manager_id
    where v.used = false
    group by v.manager_id, m.email, v.profile
    having count(*) < 10
    order by stock asc, m.email asc;
$$;

create or replace function public.get_total_commissions_30d()
returns table(total numeric)
language sql
security definer
set search_path = ''
as $$
    select coalesce(sum(amount), 0)::numeric as total
    from public.commission_logs
    where created_at >= now() - interval '30 day';
$$;

-- 4. RLS POLICIES

do $$
declare
    pol record;
begin
    for pol in (select policyname, tablename from pg_policies where schemaname = 'public') loop
        execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
    end loop;
end $$;

create policy "Managers Policy" on managers for select using ((select auth.uid())::text = id);
create policy "Apps Policy" on apps for select using (true);
create policy "Manager Apps Policy" on manager_apps for all using ((select auth.uid())::text = manager_id);
create policy "Auth Identities Policy" on auth_identities for select using ((select auth.uid())::text = manager_id);
create policy "Sites Policy" on sites for all using ((select auth.uid())::text = manager_id);
create policy "Vouchers Policy" on vouchers for all using ((select auth.uid())::text = manager_id);
create policy "Transactions Policy" on transactions for select using ((select auth.uid())::text = manager_id);
create policy "Sales Policy" on sales for select using ((select auth.uid())::text = manager_id);
create policy "Notifications Policy" on notifications for all using ((select auth.uid())::text = manager_id);
create policy "Settings Policy" on system_settings for select using (true);
create policy "Resellers Policy" on resellers for select using ((select auth.uid())::text = id);
create policy "Commissions Policy" on commission_logs for select using ((select auth.uid())::text = reseller_id);
create policy "Payouts Policy" on payout_requests for select using ((select auth.uid())::text = reseller_id);
create policy "Batches Policy" on license_batches for select using (true);
create policy "Reports Policy" on sales_reports for all using ((select auth.uid())::text = manager_id);
create policy "Licenses Policy" on licenses for all using ((select auth.uid())::text = manager_id);
create policy "Operational Events Policy" on operational_events for all using ((select auth.uid())::text = manager_id);
create policy "Sync Jobs Policy" on sync_jobs for all using ((select auth.uid())::text = manager_id);
create policy "Analytics Facts Policy" on analytics_daily_facts for select using ((select auth.uid())::text = manager_id);

-- 5. REALTIME

do $$
begin
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        create publication supabase_realtime;
    end if;
end $$;

do $$
begin
    begin
        alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
    begin
        alter publication supabase_realtime add table public.sales;
    exception when duplicate_object then null;
    end;
    begin
        alter publication supabase_realtime add table public.audit_logs;
    exception when duplicate_object then null;
    end;
    begin
        alter publication supabase_realtime add table public.operational_events;
    exception when duplicate_object then null;
    end;
end $$;

-- 6. STORAGE

insert into storage.buckets (id, name, public)
values ('manager-assets', 'manager-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('reports-pdf', 'reports-pdf', false)
on conflict (id) do nothing;

drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects for select using (bucket_id = 'manager-assets');

drop policy if exists "Manager Upload" on storage.objects;
create policy "Manager Upload" on storage.objects
for insert
with check (bucket_id = 'manager-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 7. TRIGGERS

drop trigger if exists tr_managers_touch_updated_at on managers;
create trigger tr_managers_touch_updated_at before update on managers for each row execute function public.touch_updated_at();

drop trigger if exists tr_apps_touch_updated_at on apps;
create trigger tr_apps_touch_updated_at before update on apps for each row execute function public.touch_updated_at();

drop trigger if exists tr_manager_apps_touch_updated_at on manager_apps;
create trigger tr_manager_apps_touch_updated_at before update on manager_apps for each row execute function public.touch_updated_at();

drop trigger if exists tr_auth_identities_touch_updated_at on auth_identities;
create trigger tr_auth_identities_touch_updated_at before update on auth_identities for each row execute function public.touch_updated_at();

drop trigger if exists tr_sites_touch_updated_at on sites;
create trigger tr_sites_touch_updated_at before update on sites for each row execute function public.touch_updated_at();

drop trigger if exists tr_vouchers_touch_updated_at on vouchers;
create trigger tr_vouchers_touch_updated_at before update on vouchers for each row execute function public.touch_updated_at();

drop trigger if exists tr_transactions_touch_updated_at on transactions;
create trigger tr_transactions_touch_updated_at before update on transactions for each row execute function public.touch_updated_at();

drop trigger if exists tr_resellers_touch_updated_at on resellers;
create trigger tr_resellers_touch_updated_at before update on resellers for each row execute function public.touch_updated_at();

drop trigger if exists tr_payout_requests_touch_updated_at on payout_requests;
create trigger tr_payout_requests_touch_updated_at before update on payout_requests for each row execute function public.touch_updated_at();

drop trigger if exists tr_licenses_touch_updated_at on licenses;
create trigger tr_licenses_touch_updated_at before update on licenses for each row execute function public.touch_updated_at();

drop trigger if exists tr_sync_jobs_touch_updated_at on sync_jobs;
create trigger tr_sync_jobs_touch_updated_at before update on sync_jobs for each row execute function public.touch_updated_at();

drop trigger if exists tr_analytics_daily_facts_touch_updated_at on analytics_daily_facts;
create trigger tr_analytics_daily_facts_touch_updated_at before update on analytics_daily_facts for each row execute function public.touch_updated_at();

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
    where manager_id = new.manager_id and profile = new.profile and used = false;

    if stock_count < 10 then
        insert into public.notifications (manager_id, title, message, type, metadata)
        values (
            new.manager_id,
            'Stock Faible',
            'Plus que ' || stock_count || ' tickets (' || new.profile || ').',
            'LOW_STOCK',
            jsonb_build_object('profile', new.profile, 'stock', stock_count)
        );
    end if;
    return new;
end;
$$;

drop trigger if exists tr_check_low_stock on vouchers;
create trigger tr_check_low_stock
    after update of used on vouchers
    for each row
    when (old.used = false and new.used = true)
    execute function public.notify_low_stock();

create or replace function public.log_sale_from_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.status = 'SUCCESS' and new.voucher_id is not null and (old.status is distinct from 'SUCCESS') then
        insert into public.sales (manager_id, app_id, amount, voucher_id)
        values (new.manager_id, new.app_id, new.amount, new.voucher_id);
    end if;
    return new;
end;
$$;

drop trigger if exists tr_transactions_log_sale on transactions;
create trigger tr_transactions_log_sale
    after update on transactions
    for each row
    execute function public.log_sale_from_transaction();

-- 8. ANALYTIC VIEWS

drop view if exists manager_sales_summary;
create view manager_sales_summary
with (security_invoker = true)
as
select
    manager_id,
    app_id,
    date(created_at) as sale_date,
    count(*) as tickets_sold,
    sum(amount) as total_revenue
from public.sales
group by manager_id, app_id, date(created_at);

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
