# @gr-barber/mobile

App do barbeiro — React Native + Expo.

## Setup

O scaffold do Expo já está aqui (`App.tsx`, `app.json`, `assets/`,
`tsconfig.json`), ao lado do `package.json` e do `metro.config.js`
ajustados pro monorepo. Na raiz:

```bash
pnpm install
pnpm --filter @gr-barber/mobile dev
```

## Consumindo os pacotes internos

```ts
import { calcularHorariosDisponiveis } from "@gr-barber/scheduling";
import { colors } from "@gr-barber/design-tokens";
import type { Agendamento } from "@gr-barber/types";
```
