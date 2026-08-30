# @gr-barber/mobile

App do barbeiro — React Native + Expo.

## Setup

Essa pasta já tem `package.json` e `metro.config.js` prontos pro
monorepo. Falta o resto do scaffold do Expo:

```bash
npx create-expo-app@latest tmp-scaffold
# copie App.tsx, app.json, assets/, tsconfig.json de tmp-scaffold
# pra cá, sem sobrescrever o package.json e o metro.config.js
rm -rf tmp-scaffold
```

Depois, na raiz do monorepo:

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
