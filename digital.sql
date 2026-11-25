-- ============================================================
-- Atendimento digital e follow-up
-- Rodar uma vez no SQL Editor do Supabase. Pode rodar de novo
-- sem medo: tudo é condicional.
-- ============================================================

-- 1. O interruptor que o Caio pediu: liga e desliga a aba Digital
--    para as vendedoras, loja por loja. Gerente, tablet e dono
--    sempre veem.
alter table lojas add column if not exists aba_digital boolean not null default false;

-- Depois de quantos dias sem comprar a cliente entra na lista de "sumida".
alter table lojas add column if not exists fup_sumida integer not null default 60;

-- 2. Por onde o atendimento chegou, e o contato da cliente.
--    Sem o telefone não existe follow-up: a peça que faltou
--    chega na loja e ninguém sabe para quem avisar.
alter table atendimentos add column if not exists canal    text not null default 'LOJA';
alter table atendimentos add column if not exists telefone text;
alter table atendimentos add column if not exists nome     text;

-- 3. Quem está de plantão no digital, um por loja por dia.
create table if not exists plantao (
  loja_id   text not null references lojas(id) on delete cascade,
  data      date not null,
  vendedora text not null,
  posto_por text,
  criado_em timestamptz not null default now(),
  primary key (loja_id, data)
);

-- 4. O registro de cada contato feito. A lista de quem contatar é
--    calculada na hora a partir das vendas, dos atendimentos e dos
--    bônus — aqui fica só o que foi feito, para o item sair da lista
--    e para dar para cobrar depois.
create table if not exists followups (
  id         uuid primary key default gen_random_uuid(),
  loja_id    text not null references lojas(id) on delete cascade,
  data       date not null default current_date,
  tipo       text not null,            -- CHEGOU / SUMIDA / POSVENDA / VENCENDO
  chave      text not null,            -- o id do atendimento, bônus ou cliente
  cliente_id uuid references clientes(id) on delete set null,
  nome       text,
  telefone   text,
  resultado  text not null,            -- FALEI / SEM_RESPOSTA / VENDEU / NAO_QUER
  obs        text,
  quem       text not null,
  criado_em  timestamptz not null default now()
);
create index if not exists followups_chave on followups (loja_id, tipo, chave);
create index if not exists followups_data  on followups (loja_id, data);

-- ------------------------------------------------------------
-- Regras de acesso, no mesmo padrão das outras tabelas
-- ------------------------------------------------------------
alter table plantao   enable row level security;
alter table followups enable row level security;

-- Plantão: todos da loja leem; só gestor escala.
drop policy if exists ler_pl on plantao;
create policy ler_pl on plantao for select using (ve_loja(loja_id));
drop policy if exists ins_pl on plantao;
create policy ins_pl on plantao for insert with check (ve_loja(loja_id) and eh_operador());
drop policy if exists upd_pl on plantao;
create policy upd_pl on plantao for update using (ve_loja(loja_id) and eh_operador())
                                    with check (ve_loja(loja_id) and eh_operador());
drop policy if exists del_pl on plantao;
create policy del_pl on plantao for delete using (ve_loja(loja_id) and eh_operador());

-- Follow-up: todos da loja leem e registram o próprio contato.
-- Apagar é só de gestor, para o histórico não sumir.
drop policy if exists ler_fu on followups;
create policy ler_fu on followups for select using (ve_loja(loja_id));
drop policy if exists ins_fu on followups;
create policy ins_fu on followups for insert with check (ve_loja(loja_id));
drop policy if exists upd_fu on followups;
create policy upd_fu on followups for update using (ve_loja(loja_id))
                                      with check (ve_loja(loja_id));
drop policy if exists del_fu on followups;
create policy del_fu on followups for delete using (ve_loja(loja_id) and eh_operador());

-- ------------------------------------------------------------
-- Tempo real, para duas pessoas não ligarem para a mesma cliente
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and tablename='followups') then
    alter publication supabase_realtime add table followups;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and tablename='plantao') then
    alter publication supabase_realtime add table plantao;
  end if;
end $$;

-- ------------------------------------------------------------
-- Conferência
-- ------------------------------------------------------------
select 'lojas.aba_digital' as item,
       (select count(*) from information_schema.columns
        where table_name='lojas' and column_name='aba_digital')::text as ok
union all select 'atendimentos.canal',
       (select count(*) from information_schema.columns
        where table_name='atendimentos' and column_name='canal')::text
union all select 'atendimentos.telefone',
       (select count(*) from information_schema.columns
        where table_name='atendimentos' and column_name='telefone')::text
union all select 'tabela plantao',
       (select count(*) from information_schema.tables where table_name='plantao')::text
union all select 'tabela followups',
       (select count(*) from information_schema.tables where table_name='followups')::text
union all select 'politicas novas',
       (select count(*) from pg_policies
        where schemaname='public' and tablename in ('plantao','followups'))::text;
