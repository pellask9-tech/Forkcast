create schema t;
grant usage on schema t to anon, authenticated;
create table t.results (n serial, ok boolean, label text);
grant insert, select on t.results to anon, authenticated;
grant usage on sequence t.results_n_seq to anon, authenticated;
-- Statement must succeed and change/return at least one row.
create function t.ok(q text, label text) returns void language plpgsql as $$
declare n int;
begin
  execute q; get diagnostics n = row_count;
  insert into t.results (ok, label) values (n > 0, 'ok: ' || label || case when n > 0 then '' else ' (0 rows)' end);
exception when others then
  insert into t.results (ok, label) values (false, 'ok: ' || label || ' -> ERROR ' || sqlerrm);
end $$;
-- Statement must be blocked: an error, or zero rows affected.
create function t.no(q text, label text) returns void language plpgsql as $$
declare n int;
begin
  execute q; get diagnostics n = row_count;
  insert into t.results (ok, label) values (n = 0, 'blocked: ' || label || case when n = 0 then ' (0 rows)' else ' -> ALLOWED ' || n || ' rows' end);
exception when others then
  insert into t.results (ok, label) values (true, 'blocked: ' || label || ' (' || sqlerrm || ')');
end $$;
-- Query must return exactly this many rows.
create function t.cnt(q text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || q || ') x' into n;
  insert into t.results (ok, label) values (n = expected, 'count: ' || label || ' = ' || n || case when n = expected then '' else ' (expected ' || expected || ')' end);
exception when others then
  insert into t.results (ok, label) values (false, 'count: ' || label || ' -> ERROR ' || sqlerrm);
end $$;
grant execute on all functions in schema t to anon, authenticated;
