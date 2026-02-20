-- Create email verification codes table
-- This stores temporary verification codes sent during signup and password reset
-- Migration created: 2026-02-20
-- Tables affected: vk_email_verifications

-- Create table for email verification codes
create table if not exists public.vk_email_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  purpose text not null check (purpose in ('signup', 'password_reset')),
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  verified_at timestamp with time zone,
  is_used boolean default false
);

-- Add index for faster lookups
create index if not exists idx_vk_email_verifications_email 
  on public.vk_email_verifications(email);

create index if not exists idx_vk_email_verifications_code 
  on public.vk_email_verifications(code);

-- Enable RLS
alter table public.vk_email_verifications enable row level security;

-- Allow anonymous users to create and verify codes (public operation)
create policy "allow_anon_insert_verification_codes"
  on public.vk_email_verifications
  for insert
  to anon
  with check (true);

create policy "allow_anon_select_verification_codes"
  on public.vk_email_verifications
  for select
  to anon
  using (true);

create policy "allow_anon_update_verification_codes"
  on public.vk_email_verifications
  for update
  to anon
  using (true);

-- Cleanup function to delete expired codes (run periodically)
create or replace function cleanup_expired_verification_codes()
returns void
language plpgsql
as $$
begin
  delete from public.vk_email_verifications
  where expires_at < now() - interval '1 day';
end;
$$;

-- Add comments
comment on table public.vk_email_verifications is 'Stores temporary email verification codes for signup and password reset';
comment on column public.vk_email_verifications.purpose is 'Purpose of verification: signup or password_reset';
comment on column public.vk_email_verifications.expires_at is 'Verification code expires after 10 minutes';

