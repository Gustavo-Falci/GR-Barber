# @gr-barber/api

Backend — Node.js + PostgreSQL, framework HTTP **Fastify**, ORM **Prisma**.

`src/server.ts` já sobe um servidor real com `/health`, uma rota
que consulta o Postgres de verdade via Prisma (`/barbearias/:slug/servicos`)
e um endpoint `/disponibilidade` que usa `@gr-barber/scheduling` —
o schema da rota valida o body e tipa `request.body` ao mesmo
tempo, sem precisar de Zod nem de `as any`.

```bash
pnpm --filter @gr-barber/database migrate:dev   # aplica o schema no seu Postgres
pnpm --filter @gr-barber/api dev
```

## Consumindo os pacotes internos

```ts
import { calcularHorariosDisponiveis } from "@gr-barber/scheduling";
import type { Agendamento, Barbearia } from "@gr-barber/types";
// conexão com o banco definida em @gr-barber/database
```

Esse é o único app que deve ter acesso direto ao banco — mobile e
web sempre passam pela API.
