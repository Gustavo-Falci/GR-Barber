# @gr-barber/api

Backend — Node.js + PostgreSQL, framework HTTP **Fastify**, ORM **Prisma**.

`src/app.ts` monta a aplicação inteira (rotas, plugins, tratamento de
erros) e devolve a instância sem abrir porta — é o que deixa os testes
usarem `app.inject()`. O `src/server.ts` só chama esse `buildApp()` e
escuta na 3333.

## Variáveis de ambiente

O `dev` carrega `apps/api/.env` sozinho, via
`tsx watch --env-file-if-exists=.env` — copie o `.env.example` e
preencha. Quem prefere exportar no shell continua funcionando: variável
já presente no ambiente ganha do arquivo, e o `-if-exists` faz o arquivo
ausente não abortar a subida. O `start` (bundle de produção) não carrega
`.env` nenhum — lá as variáveis vêm do systemd, do container ou do
painel da OCI. Veja `.env.example` para a lista e o formato:

- `DATABASE_URL` — Postgres de desenvolvimento.
- `JWT_SECRET` — segredo de assinatura do token. Sem ele a API não sobe,
  de propósito: subir sem segredo publicaria as rotas protegidas sem
  proteção.

A suíte de testes é a exceção: ela carrega `apps/api/.env.test`
(modelo em `.env.test.example`), que precisa apontar pro banco de
**teste** — o setup se recusa a rodar fora de um banco `*_test`, porque
cada caso trunca todas as tabelas.

## Rodando

```bash
pnpm --filter @gr-barber/database migrate:dev   # aplica o schema no seu Postgres
pnpm --filter @gr-barber/api dev
pnpm --filter @gr-barber/api test               # vitest contra Postgres de verdade
```

## Rotas

Públicas:

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/health` | sinal de vida |
| `POST` | `/auth/signup` | cria barbearia + barbeiro numa transação e devolve JWT |
| `POST` | `/auth/login` | `{ email, senha }` → JWT |
| `GET` | `/barbearias/:slug/servicos` | serviços ativos da barbearia |
| `POST` | `/disponibilidade` | horários livres, via `@gr-barber/scheduling` |

Protegidas (JWT no `Authorization: Bearer`), registradas num escopo
encapsulado que carrega o hook `autenticar` — rota nova entra ali dentro
e já nasce protegida:

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/me` | barbeiro do token |

O `barbeariaId` e o id do barbeiro saem sempre do token, nunca do corpo
nem da URL. O token vale 7 dias, e o hook confere no banco se o barbeiro
ainda existe e está ativo — desativar alguém tira o acesso na hora.

## Erros

Formato único: `{ erro: "<codigo>", mensagem?: "<detalhe>" }`. O `erro`
é sempre um código nosso — nenhum `FST_*` do Fastify e nenhum código do
Prisma sai no contrato.

| Situação | HTTP | `erro` |
|---|---|---|
| Body fora do schema | 400 | `requisicao_invalida` |
| Token ausente, inválido, expirado ou de barbeiro inativo | 401 | `nao_autenticado` |
| Credenciais erradas no login | 401 | `credenciais_invalidas` |
| Rota ou registro inexistente | 404 | `nao_encontrado` |
| Unique violada | 409 | `conflito` |
| Regra de negócio | 422 | código do domínio |
| Bug nosso | 500 | `erro_interno` |

## Consumindo os pacotes internos

```ts
import { calcularHorariosDisponiveis } from "@gr-barber/scheduling";
import type { Agendamento, Barbearia } from "@gr-barber/types";
// conexão com o banco definida em @gr-barber/database
```

Esse é o único app que deve ter acesso direto ao banco — mobile e
web sempre passam pela API.
