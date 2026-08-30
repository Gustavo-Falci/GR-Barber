# @gr-barber/web

Painel do barbeiro — Next.js.

## Setup

```bash
npx create-next-app@latest tmp-scaffold --typescript --tailwind=false --app
# copie app/, public/, next.config.js, tsconfig.json de tmp-scaffold
# pra cá, sem sobrescrever o package.json
rm -rf tmp-scaffold
```

Depois, na raiz do monorepo:

```bash
pnpm install
pnpm --filter @gr-barber/web dev
```

Os tokens de `@gr-barber/design-tokens` são objetos JS puros — pra
usar como CSS custom properties, exponha-os num provider que escreve
as variáveis no `:root` (ou `data-theme`) no layout raiz.
