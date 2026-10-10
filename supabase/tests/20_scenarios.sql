\set C   '''11111111-1111-1111-1111-111111111111'''
\set C2  '''22222222-2222-2222-2222-222222222222'''
\set M1  '''33333333-3333-3333-3333-333333333333'''
\set M2  '''44444444-4444-4444-4444-444444444444'''
insert into auth.users (id, raw_user_meta_data) values
  (:C,  '{"role":"coach","display_name":"Ana"}'),
  (:C2, '{"role":"coach","display_name":"Rico"}'),
  (:M1, '{"display_name":"Ben"}'),
  (:M2, '{"role":"admin","display_name":"Cara"}');
select t.cnt($$ select 1 from profiles where role = 'coach' $$, 2, 'sign-up creates profiles; unknown role "admin" becomes member');

-- Coach Ana builds a published profile.
select set_config('request.jwt.claim.sub', :C, false); set role authenticated;
select t.ok($$ insert into coach_profiles (id, name, headline, published, certifications, awards) values ('11111111-1111-1111-1111-111111111111', 'Ana Cruz', 'Strength coach', true, '[{"name":"NASM CPT","issuer":"NASM","year":2021}]', '[{"title":"1st, Physique","org":"PFBF","year":2023}]') $$, 'coach creates own profile');
select t.no($$ insert into coach_profiles (id, name, verified) values ('11111111-1111-1111-1111-111111111111', 'X', true) $$, 'coach cannot insert verified=true');
select t.no($$ update coach_profiles set verified = true $$, 'coach cannot verify self');
select t.no($$ insert into coach_profiles (id, name) values ('22222222-2222-2222-2222-222222222222', 'Fake') $$, 'coach cannot create someone else''s profile');
select t.ok($$ update coach_profiles set bio = 'Ten years coaching' where id = '11111111-1111-1111-1111-111111111111' $$, 'coach edits own bio');
reset role;

-- Coach Rico keeps his profile unpublished.
select set_config('request.jwt.claim.sub', :C2, false); set role authenticated;
select t.ok($$ insert into coach_profiles (id, name) values ('22222222-2222-2222-2222-222222222222', 'Rico Diaz') $$, 'second coach creates unpublished profile');
select t.no($$ update coach_profiles set bio = 'hacked' where id = '11111111-1111-1111-1111-111111111111' $$, 'coach cannot edit another coach');
reset role;

-- Member Ben.
select set_config('request.jwt.claim.sub', :M1, false); set role authenticated;
select t.no($$ insert into coach_profiles (id, name, published) values ('33333333-3333-3333-3333-333333333333', 'Ben', true) $$, 'member cannot create a coach profile');
select t.cnt($$ select 1 from coach_profiles $$, 1, 'member sees only published coaches');
select t.no($$ insert into coach_clients (coach_id, client_id) values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333') $$, 'cannot request an unpublished coach');
select t.no($$ insert into coach_clients (coach_id, client_id) values ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444') $$, 'cannot request on someone else''s behalf');
select t.no($$ insert into coach_clients (coach_id, client_id, status) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'active') $$, 'cannot skip straight to active');
select t.ok($$ insert into coach_clients (coach_id, client_id, message) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Help me bulk') $$, 'member requests a coach');
select t.no($$ insert into coach_clients (coach_id, client_id) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333') $$, 'only one open request at a time');
select t.ok($$ insert into client_snapshots (client_id, data) values ('33333333-3333-3333-3333-333333333333', '{"kcal":2100}') $$, 'member shares a snapshot');
select t.no($$ update coach_clients set status = 'active' $$, 'member cannot accept own request');
reset role;

-- Anonymous visitors see published coaches only, and nothing private.
set role anon; select set_config('request.jwt.claim.sub', '', false);
select t.cnt($$ select 1 from coach_profiles $$, 1, 'anon sees published coaches');
select t.no($$ select 1 from client_snapshots $$, 'anon cannot read snapshots');
select t.no($$ select 1 from profiles $$, 'anon cannot read profiles');
reset role;

-- Ana, while the request is pending.
select set_config('request.jwt.claim.sub', :C, false); set role authenticated;
select t.cnt($$ select 1 from coach_clients where status = 'pending' $$, 1, 'coach sees the pending request');
select t.cnt($$ select 1 from profiles $$, 2, 'coach sees own profile and requester''s name');
select t.cnt($$ select 1 from client_snapshots $$, 0, 'coach cannot see progress before accepting');
select t.no($$ insert into coach_notes (coach_id, client_id, body) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'hi') $$, 'no notes before accepting');
select t.ok($$ update coach_clients set status = 'active' where client_id = '33333333-3333-3333-3333-333333333333' $$, 'coach accepts');
select t.cnt($$ select 1 from client_snapshots $$, 1, 'coach now sees client progress');
select t.ok($$ insert into coach_notes (coach_id, client_id, body) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Great week, add 10 g protein') $$, 'coach sends a note');
select t.no($$ update coach_clients set client_id = '44444444-4444-4444-4444-444444444444' $$, 'coach cannot reassign the link');
select t.no($$ update client_snapshots set data = '{}' $$, 'coach cannot change client data');
select t.no($$ update profiles set role = 'member' where id = '11111111-1111-1111-1111-111111111111' $$, 'coach with clients cannot drop coach role');
reset role;

-- Cara, an unrelated member.
select set_config('request.jwt.claim.sub', :M2, false); set role authenticated;
select t.cnt($$ select 1 from coach_notes $$, 0, 'other member sees no notes');
select t.cnt($$ select 1 from coach_clients $$, 0, 'other member sees no links');
select t.cnt($$ select 1 from client_snapshots $$, 0, 'other member sees no snapshots');
select t.cnt($$ select 1 from profiles $$, 1, 'other member sees only own profile');
select t.ok($$ insert into client_snapshots (client_id, data) values ('44444444-4444-4444-4444-444444444444', '{"kcal":1800}') $$, 'other member saves own snapshot');
select t.no($$ update profiles set display_name = 'x' where id = '33333333-3333-3333-3333-333333333333' $$, 'cannot rename someone else');
reset role;

select set_config('request.jwt.claim.sub', :C, false); set role authenticated;
select t.cnt($$ select 1 from client_snapshots $$, 1, 'coach still sees only own client''s snapshot');
reset role;

-- Ben reads the note, then ends coaching.
select set_config('request.jwt.claim.sub', :M1, false); set role authenticated;
select t.cnt($$ select 1 from coach_notes $$, 1, 'client reads coach note');
select t.no($$ insert into coach_notes (coach_id, client_id, body) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'fake') $$, 'client cannot write as the coach');
select t.no($$ update coach_clients set status = 'declined' $$, 'client cannot use coach-only statuses');
select t.ok($$ update coach_clients set status = 'ended' $$, 'client ends coaching');
reset role;

select set_config('request.jwt.claim.sub', :C, false); set role authenticated;
select t.cnt($$ select 1 from client_snapshots $$, 0, 'coach loses access after it ends');
select t.no($$ update coach_clients set status = 'active' $$, 'coach cannot reopen an ended link');
select t.no($$ insert into coach_notes (coach_id, client_id, body) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'hi') $$, 'no notes after it ends');
select t.ok($$ insert into storage.objects (bucket_id, name) values ('coach-photos', '11111111-1111-1111-1111-111111111111/photo.jpg') $$, 'coach uploads own photo');
select t.no($$ insert into storage.objects (bucket_id, name) values ('coach-photos', '33333333-3333-3333-3333-333333333333/photo.jpg') $$, 'coach cannot upload into another folder');
select t.ok($$ update profiles set role = 'member' where id = '11111111-1111-1111-1111-111111111111' $$, 'coach without open links can switch to member');
reset role;
select t.cnt($$ select 1 from coach_profiles where id = '11111111-1111-1111-1111-111111111111' and not published $$, 1, 'switching to member unpublishes the coach profile');

-- Ben can request again later (history keeps the old link).
select set_config('request.jwt.claim.sub', :C2, false); set role authenticated;
select t.ok($$ update coach_profiles set published = true where id = '22222222-2222-2222-2222-222222222222' $$, 'Rico publishes');
reset role;
select set_config('request.jwt.claim.sub', :M1, false); set role authenticated;
select t.ok($$ insert into coach_clients (coach_id, client_id) values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333') $$, 'member can request a new coach after ending');
reset role;

-- The app owner (no signed-in user) can verify a coach from the dashboard.
select set_config('request.jwt.claim.sub', '', false);
select t.ok($$ update coach_profiles set verified = true where id = '22222222-2222-2222-2222-222222222222' $$, 'owner verifies a coach');

select (case when ok then 'PASS ' else 'FAIL ' end) || label from t.results order by n;
select count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' from t.results;
