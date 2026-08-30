import Fastify from "fastify";
import cors from "@fastify/cors";
import type { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { calcularHorariosDisponiveis } from "@gr-barber/scheduling";
import { prisma } from "@gr-barber/database";

const app = Fastify({ logger: true }).withTypeProvider<JsonSchemaToTsProvider>();

async function main() {
  // origin: true por enquanto — trocar por uma lista explícita
  // (domínio do painel web + esquema do app mobile) antes de produção.
  await app.register(cors, { origin: true });

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
        required: ["fechado"],
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

  await app.listen({ port: 3333, host: "0.0.0.0" });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
