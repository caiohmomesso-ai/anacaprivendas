-- =====================================================================
--  ANACAPRI — atualização de novembro
--
--  Só o que falta no seu banco. Não toca em nada que já está lá:
--  as 10.757 vendas, os atendimentos e a escala ficam intactos.
--  Pode rodar mais de uma vez.
--
--  A  CRM de cashback (clientes e bônus) — ficou de fora da instalação
--  B  Categorias de despesa e linhas do DRE
--  C  Horário do atendimento digital (10h às 22h)
-- =====================================================================


-- #####################################################################
-- A — CRM DE CASHBACK
-- #####################################################################

alter table lojas add column if not exists cb_pct       numeric default 30;
alter table lojas add column if not exists cb_libera    int     default 7;
alter table lojas add column if not exists cb_validade  int     default 30;
alter table lojas add column if not exists cb_multiplo  numeric default 3;

create table if not exists clientes (
  id         uuid primary key default gen_random_uuid(),
  loja_id    text not null references lojas(id) on delete cascade,
  nome       text not null,
  telefone   text,
  criado_em  timestamptz default now(),
  unique (loja_id, telefone)
);
create index if not exists ix_cl_nome on clientes (loja_id, nome);

create table if not exists bonus (
  id             uuid primary key default gen_random_uuid(),
  loja_id        text not null references lojas(id) on delete cascade,
  cliente_id     uuid not null references clientes(id) on delete cascade,
  venda_id       uuid references vendas(id) on delete set null,
  data           date not null,
  boleta         text,
  vendedora      text,
  valor_venda    numeric not null,
  valor_bonus    numeric not null,
  libera_em      date not null,
  vence_em       date not null,
  resgatado_em   date,
  resgate_boleta text,
  resgate_valor  numeric,
  criado_em      timestamptz default now()
);
create index if not exists ix_bn_dia   on bonus (loja_id, data);
create index if not exists ix_bn_vence on bonus (loja_id, vence_em);
create index if not exists ix_bn_cli   on bonus (cliente_id);

alter table clientes enable row level security;
alter table bonus    enable row level security;

drop policy if exists ler_cl on clientes;
create policy ler_cl on clientes for select to authenticated
  using (public.ve_loja(loja_id));
drop policy if exists ins_cl on clientes;
create policy ins_cl on clientes for insert to authenticated
  with check (public.ve_loja(loja_id));
drop policy if exists upd_cl on clientes;
create policy upd_cl on clientes for update to authenticated
  using (public.ve_loja(loja_id)) with check (public.ve_loja(loja_id));
drop policy if exists del_cl on clientes;
create policy del_cl on clientes for delete to authenticated
  using (public.ve_loja(loja_id) and public.eh_operador());

drop policy if exists ler_bn on bonus;
create policy ler_bn on bonus for select to authenticated
  using (public.ve_loja(loja_id));
drop policy if exists ins_bn on bonus;
create policy ins_bn on bonus for insert to authenticated
  with check (public.ve_loja(loja_id));
drop policy if exists upd_bn on bonus;
create policy upd_bn on bonus for update to authenticated
  using (public.ve_loja(loja_id)) with check (public.ve_loja(loja_id));
drop policy if exists del_bn on bonus;
create policy del_bn on bonus for delete to authenticated
  using (public.ve_loja(loja_id) and public.eh_operador());


-- #####################################################################
-- B — CATEGORIAS DE DESPESA E LINHAS DO DRE
-- #####################################################################

create table if not exists categorias_despesa (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  grupo_dre  text not null,
  ordem      int  default 0,
  ativa      boolean default true
);
create index if not exists ix_cd_grupo on categorias_despesa (grupo_dre, ordem);

alter table despesas add column if not exists categoria_id uuid references categorias_despesa(id);
create index if not exists ix_dp_cat on despesas (categoria_id);

alter table categorias_despesa enable row level security;

drop policy if exists ler_cd on categorias_despesa;
create policy ler_cd on categorias_despesa for select to authenticated using (true);
drop policy if exists mexer_cd on categorias_despesa;
create policy mexer_cd on categorias_despesa for all to authenticated
  using (public.eh_gestor()) with check (public.eh_gestor());

insert into categorias_despesa (nome, grupo_dre, ordem) values
  ('ALUGUEL','OCUPAÇÃO',1),
  ('CONDOMÍNIO','OCUPAÇÃO',2),
  ('IPTU','OCUPAÇÃO',3),
  ('ENERGIA','OCUPAÇÃO',4),
  ('ÁGUA','OCUPAÇÃO',5),
  ('FUNDO DE PROMOÇÃO DO SHOPPING','OCUPAÇÃO',6),

  ('SALÁRIOS','PESSOAL',1),
  ('ENCARGOS','PESSOAL',2),
  ('COMISSÕES','PESSOAL',3),
  ('VALE TRANSPORTE','PESSOAL',4),
  ('VALE REFEIÇÃO','PESSOAL',5),
  ('UNIFORME','PESSOAL',6),
  ('TREINAMENTO','PESSOAL',7),

  ('TRÁFEGO PAGO','MARKETING',1),
  ('MATERIAL GRÁFICO','MARKETING',2),
  ('BRINDES E AÇÕES','MARKETING',3),

  ('CONTABILIDADE','ADMINISTRATIVAS',1),
  ('SOFTWARE E SISTEMAS','ADMINISTRATIVAS',2),
  ('TELEFONE E INTERNET','ADMINISTRATIVAS',3),
  ('PAPELARIA','ADMINISTRATIVAS',4),
  ('JURÍDICO','ADMINISTRATIVAS',5),

  ('PRODUTOS DE LIMPEZA','MANUTENÇÃO E CONSUMO',1),
  ('MANUTENÇÃO PREDIAL','MANUTENÇÃO E CONSUMO',2),
  ('MANUTENÇÃO DE EQUIPAMENTOS','MANUTENÇÃO E CONSUMO',3),
  ('COPA E COZINHA','MANUTENÇÃO E CONSUMO',4),
  ('SACOLAS E EMBALAGENS','MANUTENÇÃO E CONSUMO',5),

  ('TAXAS DE CARTÃO','FINANCEIRAS',1),
  ('TARIFAS BANCÁRIAS','FINANCEIRAS',2),
  ('JUROS E MULTAS','FINANCEIRAS',3),

  ('ROYALTIES','ROYALTIES E FRANQUIA',1),
  ('FUNDO DE PROPAGANDA','ROYALTIES E FRANQUIA',2),

  ('FRETE E ENTREGA','LOGÍSTICA',1),
  ('TRANSFERÊNCIA ENTRE LOJAS','LOGÍSTICA',2),

  ('OUTRAS DESPESAS','OUTRAS',1)
on conflict (nome) do nothing;


-- #####################################################################
-- C — HORÁRIO DO ATENDIMENTO DIGITAL
-- #####################################################################

alter table lojas add column if not exists hora_abre  int default 10;
alter table lojas add column if not exists hora_fecha int default 22;

update lojas set hora_abre = 10 where hora_abre is null or hora_abre <> 10;
update lojas set hora_fecha = 22 where hora_fecha is null;


-- =====================================================================
-- CONFIRA
-- =====================================================================
-- select grupo_dre, count(*) from categorias_despesa group by 1 order by 1;
-- select id, nome, hora_abre, hora_fecha, cb_pct from lojas;
