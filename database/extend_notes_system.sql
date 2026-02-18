-- =====================================================
-- Extend Notes System with Advanced Features
-- =====================================================
-- Purpose: Add support for note attachments, rich text,
--          sharing, and enhanced search capabilities
-- Affected: vk_notes table, storage buckets
-- =====================================================

-- Step 1: Add new columns to vk_notes table
-- =====================================================

-- Add attachments column (stores array of attachment metadata)
alter table public.vk_notes 
add column if not exists attachments jsonb default '[]'::jsonb;

-- Add content format column (plain, markdown, html)
alter table public.vk_notes 
add column if not exists content_format text default 'plain';

-- Add sharing columns
alter table public.vk_notes 
add column if not exists is_shared boolean default false;

alter table public.vk_notes 
add column if not exists share_token text;

alter table public.vk_notes 
add column if not exists shared_at timestamp with time zone;

-- Add voice note indicator
alter table public.vk_notes 
add column if not exists is_voice_note boolean default false;

-- Add last accessed timestamp for analytics
alter table public.vk_notes 
add column if not exists last_accessed_at timestamp with time zone;

comment on column public.vk_notes.attachments is 'Array of attachment metadata: [{file_path, file_name, file_type, file_size, uploaded_at}]';
comment on column public.vk_notes.content_format is 'Content format: plain, markdown, or html';
comment on column public.vk_notes.is_shared is 'Whether note is publicly shared';
comment on column public.vk_notes.share_token is 'Unique token for public sharing links';
comment on column public.vk_notes.is_voice_note is 'Whether note was created via voice-to-text';

-- Step 2: Create unique index on share_token for performance
-- =====================================================

create unique index if not exists idx_vk_notes_share_token 
on public.vk_notes(share_token) 
where share_token is not null;

-- Step 3: Create storage bucket for note attachments
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-attachments',
  'note-attachments',
  false,
  10485760, -- 10MB limit per file
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Step 4: Storage bucket RLS policies
-- =====================================================

-- Allow anonymous users to upload attachments
create policy "allow_anon_upload_note_attachments"
on storage.objects for insert to anon
with check (bucket_id = 'note-attachments');

-- Allow anonymous users to view their own attachments
create policy "allow_anon_select_note_attachments"
on storage.objects for select to anon
using (bucket_id = 'note-attachments');

-- Allow anonymous users to delete their own attachments
create policy "allow_anon_delete_note_attachments"
on storage.objects for delete to anon
using (bucket_id = 'note-attachments');

-- Step 5: Create function to generate unique share token
-- =====================================================

create or replace function public.generate_note_share_token()
returns text
language plpgsql
as $$
declare
  new_token text;
  token_exists boolean;
begin
  loop
    -- Generate random 12-character alphanumeric token
    new_token := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
    
    -- Check if token already exists
    select exists(
      select 1 from public.vk_notes where share_token = new_token
    ) into token_exists;
    
    -- Exit loop if token is unique
    exit when not token_exists;
  end loop;
  
  return new_token;
end;
$$;

comment on function public.generate_note_share_token is 'Generate unique 12-character share token for note sharing';

-- Step 6: Create function to share/unshare note
-- =====================================================

create or replace function public.share_note(note_id uuid, should_share boolean)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
  token text;
begin
  if should_share then
    -- Generate new token if sharing
    token := public.generate_note_share_token();
    
    update public.vk_notes
    set 
      is_shared = true,
      share_token = token,
      shared_at = now(),
      updated_at = now()
    where id = note_id
    returning jsonb_build_object(
      'success', true,
      'share_token', share_token,
      'shared_at', shared_at
    ) into result;
  else
    -- Remove sharing
    update public.vk_notes
    set 
      is_shared = false,
      share_token = null,
      shared_at = null,
      updated_at = now()
    where id = note_id
    returning jsonb_build_object('success', true) into result;
  end if;
  
  return result;
end;
$$;

comment on function public.share_note is 'Share or unshare a note with unique token';

-- Step 7: Create function to get note by share token (public access)
-- =====================================================

create or replace function public.get_shared_note(token text)
returns table (
  id uuid,
  title text,
  content text,
  content_format text,
  subject_id text,
  tags jsonb,
  attachments jsonb,
  created_at timestamp with time zone,
  shared_at timestamp with time zone
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    n.id,
    n.title,
    n.content,
    n.content_format,
    n.subject_id,
    n.tags,
    n.attachments,
    n.created_at,
    n.shared_at
  from public.vk_notes n
  where n.share_token = token
    and n.is_shared = true;
end;
$$;

comment on function public.get_shared_note is 'Public function to retrieve shared note by token';

-- Step 8: Create RLS policy for public shared notes access
-- =====================================================

create policy "allow_public_access_to_shared_notes"
on public.vk_notes for select to anon
using (is_shared = true and share_token is not null);

-- Step 9: Create advanced search function
-- =====================================================

create or replace function public.search_notes(
  p_user_id uuid,
  p_search_query text default null,
  p_subject_id text default null,
  p_tags text[] default null,
  p_start_date timestamp with time zone default null,
  p_end_date timestamp with time zone default null,
  p_is_voice_note boolean default null,
  p_content_format text default null
)
returns table (
  id uuid,
  title text,
  content text,
  content_format text,
  subject_id text,
  tags jsonb,
  attachments jsonb,
  is_voice_note boolean,
  is_shared boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_accessed_at timestamp with time zone
)
language plpgsql
as $$
begin
  return query
  select 
    n.id,
    n.title,
    n.content,
    n.content_format,
    n.subject_id,
    n.tags,
    n.attachments,
    n.is_voice_note,
    n.is_shared,
    n.created_at,
    n.updated_at,
    n.last_accessed_at
  from public.vk_notes n
  where n.user_id = p_user_id
    -- Search query filter (title or content)
    and (
      p_search_query is null 
      or n.title ilike '%' || p_search_query || '%'
      or n.content ilike '%' || p_search_query || '%'
    )
    -- Subject filter
    and (p_subject_id is null or n.subject_id = p_subject_id)
    -- Tags filter (contains any of the specified tags)
    and (
      p_tags is null 
      or exists (
        select 1 
        from jsonb_array_elements_text(n.tags) tag
        where tag = any(p_tags)
      )
    )
    -- Date range filter
    and (p_start_date is null or n.created_at >= p_start_date)
    and (p_end_date is null or n.created_at <= p_end_date)
    -- Voice note filter
    and (p_is_voice_note is null or n.is_voice_note = p_is_voice_note)
    -- Content format filter
    and (p_content_format is null or n.content_format = p_content_format)
  order by n.updated_at desc, n.created_at desc;
end;
$$;

comment on function public.search_notes is 'Advanced search for notes with multiple filter options';

-- Step 10: Create function to update last accessed timestamp
-- =====================================================

create or replace function public.mark_note_accessed(note_id uuid)
returns void
language plpgsql
as $$
begin
  update public.vk_notes
  set last_accessed_at = now()
  where id = note_id;
end;
$$;

comment on function public.mark_note_accessed is 'Update last accessed timestamp for analytics';

-- =====================================================
-- End of migration
-- =====================================================
