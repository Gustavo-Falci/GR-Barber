# Roteiro

O que falta pro GR Barber sair do papel, mais ou menos em ordem:

1. **Rodar os scaffolds do Expo e do Next.js** — dentro de
   `apps/mobile` e `apps/web`, seguindo os READMEs de cada um, sem
   sobrescrever `package.json`/`metro.config.js`.
2. **Completar as rotas da API** — em andamento, guiado pela spec
   `docs/superpowers/specs/2026-08-30-api-crud-agendamentos-design.md`,
   que divide o trabalho em cinco fases. A autenticação foi fundida
   aqui dentro (era o passo 3 separado), porque quase toda rota de
   escrita precisa saber qual barbearia é a do chamador — sem isso as
   rotas nasceriam abertas ou receberiam `barbeariaId` no corpo, e
   seriam reescritas quando o JWT chegasse.
   - **Fases 1 e 2, prontas** (PR #1): infraestrutura de teste contra
     Postgres real, camada de conversão de horários, `buildApp()`,
     hash `scrypt`, tradutor central de erros, e autenticação JWT com
     `POST /auth/signup`, `POST /auth/login` e `GET /me`.
   - **Fase 3** — cadastros do barbeiro: `PATCH /me`,
     `PATCH /barbearias/me`, `GET/PUT /barbearias/me/horarios`, CRUD de
     `Servico` e de `Cliente`, e o perfil público
     `GET /barbearias/:slug`.
   - **Fase 4** — criação de agendamento: os dois `POST`, a tradução da
     violação de `sem_conflito_horario` em `409`, e os testes de
     conflito e de corrida contra banco real.
   - **Fase 5** — disponibilidade: as duas rotas de leitura (dia e mês)
     e a remoção do `POST /disponibilidade` antigo, que é calculadora
     sem estado e nenhuma tela pode usar.
3. **Construir as telas reais** — as 23 telas já mapeadas
   (`docs/screens.md`) em React Native e Next.js de verdade, usando
   os tokens de `packages/design-tokens`.
4. **Lembretes automáticos** — decidir WhatsApp Business API vs
   push notification via Expo, e integrar o disparo ao confirmar
   um agendamento. Ainda não arquitetado.
5. **Infra na Oracle OCI** — provisionar a VM, subir o Postgres,
   configurar variáveis de ambiente, deploy do backend e do painel.
6. **Comprar o domínio** `barchop.com.br` e apontar o DNS.
7. **Piloto com o barbeiro real** que validou o problema original,
   antes de pensar em abrir pra outras barbearias.

## Dívidas conhecidas

- **`POST /auth/signup` diz se um email já está cadastrado**, via o
  `409`. Quem quiser sondar a plataforma manda um slug livre e um email
  qualquer, e o código de resposta responde. Fechar isso de verdade
  precisa de verificação de email ou de rate limiting, os dois fora do
  escopo da spec atual — fica pro passo de infra, junto com o que mais
  proteger o fluxo público.
