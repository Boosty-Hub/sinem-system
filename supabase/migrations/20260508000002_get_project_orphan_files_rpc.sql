create or replace function public.get_project_orphan_files(p_project_id uuid)
returns table(
  storage_path text,
  original_name text,
  size bigint,
  mimetype text,
  created_at timestamptz,
  step_number int,
  subfolder text
)
language sql
security definer
set search_path = public, storage
as $$
  select
    o.name as storage_path,
    case
      when array_length(string_to_array(o.name, '/'), 1) = 3 then
        case
          when length(split_part(o.name, '/', 3)) > 37 and substring(split_part(o.name, '/', 3) from 37 for 1) = '-'
          then substring(split_part(o.name, '/', 3) from 38)
          else split_part(o.name, '/', 3)
        end
      when array_length(string_to_array(o.name, '/'), 1) = 4 then
        case
          when length(split_part(o.name, '/', 4)) > 37 and substring(split_part(o.name, '/', 4) from 37 for 1) = '-'
          then substring(split_part(o.name, '/', 4) from 38)
          else split_part(o.name, '/', 4)
        end
      else o.name
    end as original_name,
    coalesce((o.metadata->>'size')::bigint, 0) as size,
    coalesce(o.metadata->>'mimetype', 'application/octet-stream') as mimetype,
    o.created_at,
    (substring(split_part(o.name, '/', 2) from 'step-(\d+)'))::int as step_number,
    case when array_length(string_to_array(o.name, '/'), 1) = 4 then split_part(o.name, '/', 3) else null end as subfolder
  from storage.objects o
  where o.bucket_id = 'project-files'
    and split_part(o.name, '/', 1) = p_project_id::text
    and substring(split_part(o.name, '/', 2) from 'step-(\d+)') is not null
    and not exists (select 1 from public.project_documents pd where pd.storage_path = o.name)
  order by step_number, subfolder nulls first, original_name;
$$;

grant execute on function public.get_project_orphan_files(uuid) to authenticated, anon;
