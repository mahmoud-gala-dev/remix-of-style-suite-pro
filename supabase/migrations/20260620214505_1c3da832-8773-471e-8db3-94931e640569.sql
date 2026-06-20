
-- ============ ENUMS ============
create type public.app_role as enum ('super_admin', 'admin', 'reception', 'staff', 'customer');
create type public.booking_status as enum ('pending', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show');
create type public.queue_status as enum ('waiting', 'called', 'in_progress', 'completed', 'cancelled');
create type public.gender_t as enum ('male', 'female', 'both');

-- ============ UPDATED_AT TRIGGER FN ============
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.has_any_staff_role(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('super_admin','admin','reception','staff')
  );
$$;

create policy "view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "super admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

-- ============ BRANCHES ============
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  address text,
  phone text,
  chairs int not null default 1,
  hours_open text not null default '09:00',
  hours_close text not null default '22:00',
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.branches to authenticated;
grant all on public.branches to service_role;
alter table public.branches enable row level security;
create policy "staff view branches" on public.branches for select to authenticated using (public.has_any_staff_role(auth.uid()));
create policy "admin manage branches" on public.branches for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create trigger branches_updated before update on public.branches for each row execute function public.set_updated_at();

-- ============ SERVICES ============
create table public.services (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  category text,
  duration_min int not null default 30,
  price numeric(10,2) not null default 0,
  gender public.gender_t not null default 'both',
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.services(branch_id);
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "staff view services" on public.services for select to authenticated using (public.has_any_staff_role(auth.uid()));
create policy "admin manage services" on public.services for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create trigger services_updated before update on public.services for each row execute function public.set_updated_at();

-- ============ EMPLOYEES ============
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  phone text,
  email text,
  role text not null default 'barber',
  specialization text,
  commission_pct numeric(5,2) not null default 0,
  rating numeric(3,2) not null default 0,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.employees(branch_id);
grant select, insert, update, delete on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;
create policy "staff view employees" on public.employees for select to authenticated using (public.has_any_staff_role(auth.uid()));
create policy "admin manage employees" on public.employees for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create trigger employees_updated before update on public.employees for each row execute function public.set_updated_at();

-- ============ CUSTOMERS ============
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  gender public.gender_t,
  birthday date,
  notes text,
  photo_url text,
  visits int not null default 0,
  total_spend numeric(12,2) not null default 0,
  points int not null default 0,
  last_visit timestamptz,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.customers(branch_id);
create index on public.customers(phone);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "staff manage customers" on public.customers for all to authenticated
  using (public.has_any_staff_role(auth.uid())) with check (public.has_any_staff_role(auth.uid()));
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();

-- ============ BOOKINGS ============
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.booking_status not null default 'pending',
  price numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.bookings(branch_id, start_at);
create index on public.bookings(employee_id, start_at);
create index on public.bookings(customer_id);
grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "staff manage bookings" on public.bookings for all to authenticated
  using (public.has_any_staff_role(auth.uid())) with check (public.has_any_staff_role(auth.uid()));
create trigger bookings_updated before update on public.bookings for each row execute function public.set_updated_at();

-- ============ QUEUE ITEMS ============
create table public.queue_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  status public.queue_status not null default 'waiting',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.queue_items(branch_id, position);
grant select, insert, update, delete on public.queue_items to authenticated;
grant all on public.queue_items to service_role;
alter table public.queue_items enable row level security;
create policy "staff manage queue" on public.queue_items for all to authenticated
  using (public.has_any_staff_role(auth.uid())) with check (public.has_any_staff_role(auth.uid()));
create trigger queue_items_updated before update on public.queue_items for each row execute function public.set_updated_at();
