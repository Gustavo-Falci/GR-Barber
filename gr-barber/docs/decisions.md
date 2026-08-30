# Decisões técnicas

Registro do porquê de cada escolha, não só o quê — pra não perder
o raciocínio depois.

## Monorepo: pnpm workspaces + Turborepo

Mobile, painel e API compartilham tipos, tokens de design e a
lógica de cálculo de disponibilidade — sem monorepo isso duplicaria
ou dessincronizaria. pnpm por eficiência de disco e suporte a
`workspace:*`; Turborepo pra orquestrar build/dev com cache.

**Pegadinha conhecida**: o Metro (bundler do Expo) não lida bem com
o node_modules simbólico padrão do pnpm — por isso o
`.npmrc` com `node-linker=hoisted` e o `metro.config.js` customizado
em `apps/mobile`.

## Framework HTTP: Fastify

Comparado com Express e Hono. Decisivo: validação de schema nativa
(JSON Schema direto na rota, sem precisar de Zod à parte) e boa
inferência de tipo com `@fastify/type-provider-json-schema-to-ts` —
casa com o resto do projeto sendo TypeScript estrito. Express tem
mais tutorial/mais gente usando, mas você reconstrói na mão o que
o Fastify já resolve.

## ORM: Prisma

Comparado com Drizzle e SQL puro + Kysely. Decisivo: a maior
comunidade do ecossistema TS, e como o schema já estava bem
definido, a geração automática de tipos elimina manter
`@gr-barber/types` como espelho de tabela à mão.

**Pegadinha conhecida**: nem Prisma nem Drizzle sabem representar a
`EXCLUDE USING gist` (trava anti-conflito de horário) nem colunas
`GENERATED ALWAYS AS ... STORED` no schema declarativo. Solução:
adicionadas à mão na migration inicial — ver
`packages/database/README.md`.

## Banco: PostgreSQL com exclusion constraint

Além do cálculo de horários livres feito na aplicação
(`packages/scheduling`), o banco tem uma trava própria contra dois
agendamentos do mesmo barbeiro se sobrepondo — protege contra
condição de corrida (dois clientes confirmando o mesmo horário ao
mesmo tempo), que a lógica da aplicação sozinha não resolveria de
forma confiável.

## Identidade visual: neobrutalismo, referência de mercado

O estilo (bordas grossas, sombras duras sem desfoque, amarelo
`#FFD900` como cor de ação única) foi adaptado de uma auditoria de
UI do **barbeiro.app**, um concorrente já existente no mercado —
não afiliado ao GR Barber. Decisão consciente de seguir de perto
essa linguagem visual, não só usar como inspiração solta.
Tokens completos em `packages/design-tokens` e
`docs/design-system.html`.
