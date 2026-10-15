-- 0010 · storage buckets and their policies
--
-- Five buckets, all private. Access is by short-lived signed URL generated
-- after a permission check, never by public URL — a "private" bucket with a
-- guessable path is a public bucket with extra steps.
--
-- Path convention: {tenant_id}/{employee_id}/{uuid}-{filename}
-- The tenant id as the first segment is what makes the policies below
-- expressible as a simple prefix comparison.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Contracts, right-to-work evidence, certificates, fit notes.
  ('employee-documents', 'employee-documents', false, 26214400,
   array['application/pdf','image/jpeg','image/png','image/heic',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),

  -- Expense receipts. Smaller limit: a receipt is a photo, and a 25MB receipt
  -- is someone uploading a video by accident.
  ('receipts', 'receipts', false, 10485760,
   array['application/pdf','image/jpeg','image/png','image/heic']),

  -- Generated payslips and P60s. Written only by the service role inside the
  -- payroll function; nothing else may put a file here.
  ('payslips', 'payslips', false, 5242880, array['application/pdf']),

  -- Candidate CVs. Shortest retention of anything in the system.
  ('cvs', 'cvs', false, 10485760,
   array['application/pdf','application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),

  -- Profile photos. Images only, and a tight limit, because this one is
  -- displayed in lists and nobody wants a 20MB avatar.
  ('avatars', 'avatars', false, 2097152,
   array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- helper
-- First path segment as a uuid, or null. Used by every policy below.
create or replace function app.storage_tenant(p_name text)
returns uuid language plpgsql immutable as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;   -- malformed path never matches a policy
end $$;

-- Second path segment, the employee id.
create or replace function app.storage_employee(p_name text)
returns uuid language plpgsql immutable as $$
begin
  return (storage.foldername(p_name))[2]::uuid;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------- employee-documents
-- Read follows employee visibility, exactly as the documents table does. The
-- two must agree: a metadata row an employee cannot see, whose file they can
-- download, is a leak with a paper trail saying otherwise.
create policy employee_docs_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'employee-documents'
    and app.storage_tenant(name) = app.current_tenant()
    and (
      app.is_admin()
      or app.storage_employee(name) in (select app.visible_employee_ids())
    )
  );

create policy employee_docs_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'employee-documents'
    and app.storage_tenant(name) = app.current_tenant()
    and (app.is_admin() or app.storage_employee(name) = app.current_employee())
  );

-- Deletion is admin-only, and the application soft-deletes the metadata row
-- rather than removing the object, so a deleted contract is still
-- recoverable during any retention period.
create policy employee_docs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'employee-documents'
    and app.storage_tenant(name) = app.current_tenant()
    and app.is_admin()
  );

-- ---------------------------------------------------------------- receipts
create policy receipts_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and app.storage_tenant(name) = app.current_tenant()
    and (
      app.is_admin()
      or app.current_role_name() = 'manager'
      or app.storage_employee(name) = app.current_employee()
    )
  );

create policy receipts_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and app.storage_tenant(name) = app.current_tenant()
    and app.storage_employee(name) = app.current_employee()
  );

-- ---------------------------------------------------------------- payslips
-- Read your own, or anyone's with payroll permission. Deliberately NO insert
-- or update policy for authenticated users: payslips are written by the
-- payroll function under the service role. A client that can write a payslip
-- can write a false one.
create policy payslips_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payslips'
    and app.storage_tenant(name) = app.current_tenant()
    and (app.can_read_payroll() or app.storage_employee(name) = app.current_employee())
  );

-- ---------------------------------------------------------------- cvs
-- Admins and managers only, matching the candidates table. The employee who
-- made a referral does not get to read the CV.
create policy cvs_access on storage.objects
  for all to authenticated
  using (
    bucket_id = 'cvs'
    and app.storage_tenant(name) = app.current_tenant()
    and (app.is_admin() or app.current_role_name() = 'manager')
  )
  with check (
    bucket_id = 'cvs'
    and app.storage_tenant(name) = app.current_tenant()
    and (app.is_admin() or app.current_role_name() = 'manager')
  );

-- ---------------------------------------------------------------- avatars
-- Readable across the tenant — it is a colleague directory photo. Writable
-- only by the person it belongs to, or an admin.
create policy avatars_read on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and app.storage_tenant(name) = app.current_tenant());

create policy avatars_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and app.storage_tenant(name) = app.current_tenant()
    and (app.is_admin() or app.storage_employee(name) = app.current_employee())
  );

create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and app.storage_tenant(name) = app.current_tenant()
    and (app.is_admin() or app.storage_employee(name) = app.current_employee())
  );

commit;
