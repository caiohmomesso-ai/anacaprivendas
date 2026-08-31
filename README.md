# Anacapri — Gestão de vendas

Página única servida como arquivo estático. Os dados ficam no Supabase.
Não há etapa de compilação.

```
index.html   o sistema inteiro
schema.sql   o banco (rodar uma vez)
README.md    este arquivo
```

---

## 1. Criar o projeto no Supabase

Novo projeto, região São Paulo. Guarde a senha do banco.

Em **SQL Editor**, cole o `schema.sql` inteiro e rode. Ele cria as tabelas,
as regras de acesso, liga o tempo real e já deixa as duas lojas, a equipe,
os motivos de não venda e os motivos de pausa cadastrados.

## 2. Criar os logins

Em **Authentication → Users → Add user**, crie um usuário por pessoa, marcando
**Auto Confirm User**. São dez: você, Amanda, Kelly e as seis vendedoras.

Em **Providers → Email**, desligue `Enable sign ups` — assim ninguém cria conta sozinho.

## 3. Amarrar cada login à pessoa

Sem isso o sistema não sabe quem entrou. No **SQL Editor**:

```sql
-- você, que enxerga as duas lojas
insert into pessoas (loja_id, nome, papel) values (null, 'CAIO', 'dono');

update pessoas set user_id = (select id from auth.users where email = 'caio@exemplo.com')  where nome = 'CAIO';
update pessoas set user_id = (select id from auth.users where email = 'amanda@exemplo.com') where nome = 'AMANDA';
update pessoas set user_id = (select id from auth.users where email = 'erika@exemplo.com')  where nome = 'ERIKA';
-- e assim por diante
```

Confira se sobrou alguém:

```sql
select nome, papel, loja_id, user_id from pessoas order by loja_id, ordem;
```

## 4. Configurar o index.html

No começo do `<script>`, troque as duas linhas:

```js
const SUPABASE_URL  = 'https://xxxx.supabase.co';
const SUPABASE_ANON = 'eyJhbGc...';
```

As duas estão no Supabase, em **Settings → API**. A chave é a **anon public** —
ela pode ficar no arquivo, porque quem protege os dados são as regras de acesso
do banco, não o segredo da chave.

## 5. Publicar na Vercel

Repositório novo no GitHub (pode ser privado) com os três arquivos.
Na Vercel: **Add New → Project**, escolha o repositório, Framework Preset **Other**,
Build Command e Output Directory **em branco**, e Deploy.

Sai um endereço tipo `anacapri.vercel.app`. Toda alteração enviada ao GitHub
publica sozinha em segundos.

## 6. Liberar o endereço no Supabase

**Authentication → URL Configuration**: coloque o endereço da Vercel em
`Site URL` e também em `Redirect URLs`.

---

## Quem vê o quê

| | Dono | Gerente | Vendedora |
|---|---|---|---|
| Lista da vez | as duas lojas | a loja dela | a loja dela |
| Lançar vendas | sim | sim | só encerrando atendimento |
| Caixa e conferência da gaveta | sim | sim | não |
| Registrar sangria | sim | sim | sim |
| Apagar venda, sangria ou pessoa | sim | sim | não |
| Painel, Equipe, Despesas | sim | sim | só o painel dela |
| Ajustes e metas | sim | só a loja dela | não |

Isso não é só a tela que muda: as regras estão no banco. Mesmo que alguém
tente por fora, o Postgres recusa.

## Primeiro dia

1. Entre como você e confira as metas de setembro em **Ajustes**
2. Revise os motivos de não venda — corte o que não faz sentido para a Anacapri
3. A gerente lança o caixa de abertura em **Caixa**
4. A equipe usa a **Lista da vez** o dia todo: atender, encerrar, vendeu ou não
5. No fim do dia a gerente conta a gaveta e lança em **Contagem no fechamento**

A venda nasce do encerramento do atendimento. Ninguém digita duas vezes,
e a conversão sai sozinha.

## O que ainda não existe

- Venda online lançada pela vendedora (hoje só pela gerente, em **Lançar**)
- Conversão por faixa de horário
- Registro de entrada e saída do time
- Feedback com plano de ação
- Comparativo com o mesmo mês do ano anterior — só a partir de setembro de 2027

## Se algo der errado

**Entra e cai de volta no login:** o e-mail não está amarrado em `pessoas.user_id`.
Rode a consulta do passo 3.

**Entra mas não salva nada:** confira as políticas no SQL Editor —
`select tablename, policyname from pg_policies where schemaname='public';`

**A fila não atualiza em outro aparelho:** o tempo real não foi ligado.
Rode de novo a parte final do `schema.sql`, a partir de `alter publication`.
