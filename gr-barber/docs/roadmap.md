# Roteiro

O que falta pro GR Barber sair do papel, mais ou menos em ordem:

1. **Scaffolds do Expo e do Next.js — pronto.** `apps/mobile` e
   `apps/web` já têm o scaffold versionado (commit `6abe8a1`), com o
   `package.json` e o `metro.config.js` do monorepo preservados.
2. **Rotas da API — pronto.** A spec
   `docs/superpowers/specs/2026-08-30-api-crud-agendamentos-design.md`
   dividiu o trabalho em cinco fases, todas concluídas: fundação e
   autenticação (PR #1), cadastros do barbeiro (PR #2), criação de
   agendamento (PR #3) e disponibilidade (PR #4), mais o retry em
   deadlock do PR #5. Cada uma tem plano próprio em
   `docs/superpowers/plans/`. A autenticação foi
   fundida aqui dentro (era o passo 3 separado), porque quase toda rota
   de escrita precisa saber qual barbearia é a do chamador — sem isso
   as rotas nasceriam abertas ou receberiam `barbeariaId` no corpo, e
   seriam reescritas quando o JWT chegasse.

   A fase 6 (identidade do cliente) fechou as duas lacunas que
   sobraram: o `barbeiroId` que nenhuma rota pública devolvia, e a
   conta do cliente que a tela "Meus agendamentos" precisa. Spec em
   `docs/superpowers/specs/2026-09-04-api-identidade-cliente-design.md`.

   A superfície HTTP que as 23 telas consomem está completa; o que a
   spec deixou de fora continua fora (múltiplos barbeiros por
   barbearia, barbearias em fusos diferentes).
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
- **Quem definir a senha primeiro assume o cadastro de um telefone.**
  Os cadastros de `Cliente` são criados por outra pessoa — pelo upsert
  do agendamento público, ou pelo barbeiro no walk-in. Sem verificar
  posse do número, a API não distingue o dono do telefone de quem só o
  conhece, e quem chegar primeiro passa a ver o histórico daquela
  pessoa naquela barbearia. A mitigação é que definir senha só é
  permitido em cadastro que ainda não tem uma, e ela hoje vale de
  verdade: desde a normalização de telefone (`lib/telefone.ts`), o
  número é gravado num formato único — `(11) 99999-8888` — pelos quatro
  escritores e pelas buscas, então a mesma pessoa ocupa uma linha só e
  o `409` não se contorna reformatando o número. Fica de pé o buraco
  original, que só o OTP fecha: quem conhece o número de outra pessoa e
  chega antes dela ainda reivindica o cadastro. Fecha junto com o canal
  de mensagem do passo 4, que traz o código de verificação.
  Sobra um detalhe menor: dois signups concorrentes no mesmo cadastro
  sem senha passam os dois — ambos leem `senhaHash` nulo, ambos gravam,
  o último grava por cima, e os dois chamadores saem com token válido.
  Fechar isso é um `updateMany` com predicado de status, do mesmo
  formato do que o remarcar já usa.
- **O `409` do signup de cliente diz que aquele telefone já tem conta**,
  exatamente como o do barbeiro diz do email. Mesma dívida, mesmo
  fechamento.
- **Nenhuma das duas rotas que criam ou movem um agendamento recusa uma
  data no passado.** `POST /barbearias/:slug/agendamentos` e
  `POST /clientes/me/agendamentos/:id/remarcar` passam pelo mesmo
  `horariosLivres`, que não tem noção de "agora" — só recebe a janela
  de funcionamento e os horários já ocupados. O único relógio do fluxo
  é o `agoraNaBarbearia`, usado pelo `garantirAlteravel` em
  `lib/agendamento-alteravel.ts`, e essa guarda olha pro agendamento
  de origem, o que está sendo alterado, nunca pro destino da mudança.
  Na prática, um cliente que remarca pra uma data passada tranca a
  própria conta: o agendamento resultante é exatamente o que o
  `garantirAlteravel` recusa cancelar ou remarcar depois, e só o
  barbeiro consegue desfazer. O fechamento tem a forma de um
  `garantirFuturo(data, horaInicio)` ao lado do `garantirAlteravel`,
  chamado pelas rotas que criam ou movem um agendamento — isso não
  quer dizer que já está na fila pra ser feito. Empurrar a checagem
  pra dentro do `criarAgendamento` mudaria comportamento da fase 4,
  que já tem testes escritos sem essa regra.
