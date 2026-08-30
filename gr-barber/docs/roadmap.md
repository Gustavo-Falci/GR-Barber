# Roteiro

O que falta pro GR Barber sair do papel, mais ou menos em ordem:

1. **Rodar os scaffolds do Expo e do Next.js** — dentro de
   `apps/mobile` e `apps/web`, seguindo os READMEs de cada um, sem
   sobrescrever `package.json`/`metro.config.js`.
2. **Completar as rotas da API** — hoje só existem `/health`,
   `/disponibilidade` e `/barbearias/:slug/servicos`. Falta o CRUD
   completo de `Barbearia`, `Barbeiro`, `Cliente`, `Servico`, e a
   rota de criar `Agendamento` (usa `calcularHorariosDisponiveis`
   pra validar antes de gravar).
3. **Autenticação** — login obrigatório do Barbeiro, opcional do
   Cliente (`senha_hash` nulo = sem conta), via `@fastify/jwt`.
4. **Construir as telas reais** — as 23 telas já mapeadas
   (`docs/screens.md`) em React Native e Next.js de verdade, usando
   os tokens de `packages/design-tokens`.
5. **Lembretes automáticos** — decidir WhatsApp Business API vs
   push notification via Expo, e integrar o disparo ao confirmar
   um agendamento. Ainda não arquitetado.
6. **Infra na Oracle OCI** — provisionar a VM, subir o Postgres,
   configurar variáveis de ambiente, deploy do backend e do painel.
7. **Comprar o domínio** `barchop.com.br` e apontar o DNS.
8. **Piloto com o barbeiro real** que validou o problema original,
   antes de pensar em abrir pra outras barbearias.
