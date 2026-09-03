import cors from "@fastify/cors";
import Fastify from "fastify";
import type { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { calcularHorariosDisponiveis } from "@gr-barber/scheduling";
import { prisma } from "@gr-barber/database";
import { registrarTratamentoDeErros } from "./plugins/erros";
import { autenticar, registrarAuth } from "./plugins/auth";
import { registrarRotasAuth } from "./rotas/auth";
import {
  registrarRotasBarbeariasProtegidas,
  registrarRotasBarbeariasPublicas,
} from "./rotas/barbearias";
import { registrarRotasHorarios } from "./rotas/horarios";
import { registrarRotasMe } from "./rotas/me";
import type { App } from "./tipos";

// Monta a instância sem escutar em porta nenhuma. É o que permite os
// testes usarem app.inject(). Quem abre a porta é o server.ts.
export function buildApp(opts: { logger?: boolean } = {}): App {
  const app = Fastify({
    logger: opts.logger ?? false,
    // O AJV do Fastify vem com `removeAdditional: true`: campo fora do
    // schema é apagado do corpo em silêncio, e a rota responde 200 como
    // se estivesse tudo certo. Com `additionalProperties: false` nos
    // corpos, queremos o contrário — 400 dizendo qual campo sobra. É o
    // que separa "mandei `telephone` em vez de `telefone`" de "salvou
    // sem esse campo e não me avisou", e o que faz um `barbeariaId`
    // no corpo de rota protegida ser recusado em vez de ignorado.
    ajv: { customOptions: { removeAdditional: false } },
  }).withTypeProvider<JsonSchemaToTsProvider>();

  // origin: true por enquanto — trocar por uma lista explícita
  // (domínio do painel web + esquema do app mobile) antes de produção.
  app.register(cors, { origin: true });

  registrarTratamentoDeErros(app);

  // Rota não encontrada não passa pelo setErrorHandler no Fastify: sem
  // isto a API responderia com duas formas de erro incompatíveis, a
  // nossa e a do framework ({ message, error, statusCode }).
  app.setNotFoundHandler(async (_request, reply) =>
    reply.code(404).send({ erro: "nao_encontrado" })
  );

  registrarAuth(app);
  registrarRotasAuth(app);
  registrarRotasBarbeariasPublicas(app);

  // Escopo dos protegidos: o hook vale pra tudo que for registrado aqui
  // dentro. Pendurar onRequest rota a rota dependeria de ninguém
  // esquecer, e quem esquecesse publicaria a rota em silêncio.
  app.register(async (protegidas: App) => {
    protegidas.addHook("onRequest", autenticar);
    registrarRotasMe(protegidas);
    registrarRotasBarbeariasProtegidas(protegidas);
    registrarRotasHorarios(protegidas);
  });

  app.get("/health", async () => ({ status: "ok" }));

  // Exemplo real usando o Prisma — lista os serviços ativos de
  // uma barbearia, o primeiro passo do fluxo de agendamento do cliente.
  app.get(
    "/barbearias/:slug/servicos",
    { schema: { params: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } } },
    async (request) => {
      const { slug } = request.params;
      const barbearia = await prisma.barbearia.findUniqueOrThrow({ where: { slug } });
      return prisma.servico.findMany({
        where: { barbeariaId: barbearia.id, ativo: true },
        orderBy: { nome: "asc" },
      });
    }
  );

  // Exemplo do padrão "schema da rota é a validação": o mesmo
  // objeto que valida o body também tipa `request.body` — sem
  // precisar de Zod nem de `as any`.
  const disponibilidadeBodySchema = {
    type: "object",
    required: ["horarioFuncionamento", "agendamentosExistentes", "duracaoTotalMinutos"],
    properties: {
      horarioFuncionamento: {
        type: "object",
        // As três chaves são required porque JanelaFuncionamento
        // (@gr-barber/scheduling) declara horaAbertura/horaFechamento
        // como string | null, sem undefined. Fora do required o schema
        // geraria `| undefined` e o tipo não encaixaria.
        required: ["horaAbertura", "horaFechamento", "fechado"],
        properties: {
          horaAbertura: { type: ["string", "null"] },
          horaFechamento: { type: ["string", "null"] },
          fechado: { type: "boolean" },
        },
      },
      agendamentosExistentes: {
        type: "array",
        items: {
          type: "object",
          required: ["horaInicio", "horaFim"],
          properties: {
            horaInicio: { type: "string" },
            horaFim: { type: "string" },
          },
        },
      },
      duracaoTotalMinutos: { type: "number", minimum: 1 },
      intervaloMinutos: { type: "number", minimum: 5 },
    },
  } as const;

  app.post(
    "/disponibilidade",
    { schema: { body: disponibilidadeBodySchema } },
    async (request) => {
      // request.body já vem tipado a partir do schema acima —
      // esse é o cálculo que vira "quais horários mostrar pro
      // cliente" na tela de Escolha do horário.
      const horarios = calcularHorariosDisponiveis(request.body);
      return { horarios };
    }
  );

  return app;
}
