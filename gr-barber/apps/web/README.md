# @gr-barber/web

Painel do barbeiro — Next.js.

## Setup

O scaffold do Next.js já está aqui (`app/`, `next.config.js`,
`tsconfig.json`), ao lado do `package.json` do monorepo. Na raiz:

```bash
pnpm install
pnpm --filter @gr-barber/web dev
```

Os tokens de `@gr-barber/design-tokens` são objetos JS puros — pra
usar como CSS custom properties, exponha-os num provider que escreve
as variáveis no `:root` (ou `data-theme`) no layout raiz. O
`app/tokens-css.ts` já faz essa ponte.
