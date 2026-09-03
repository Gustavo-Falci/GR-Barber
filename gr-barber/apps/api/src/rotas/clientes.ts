import { prisma } from "@gr-barber/database";
import { PADRAO_EMAIL, PADRAO_TELEFONE } from "../lib/padroes";
import { serializarCliente } from "../lib/serializar";
import type { App } from "../tipos";

const corpoNovoCliente = {
  type: "object",
  additionalProperties: false,
  required: ["nome", "telefone"],
  properties: {
    nome: { type: "string", minLength: 2, maxLength: 120 },
    telefone: { type: "string", pattern: PADRAO_TELEFONE, maxLength: 20 },
    email: { type: ["string", "null"], pattern: PADRAO_EMAIL, maxLength: 160 },
  },
} as const;

const buscaClientes = {
  type: "object",
  additionalProperties: false,
  properties: { busca: { type: "string", minLength: 1, maxLength: 120 } },
} as const;

// Mesma normalização do login: a coluna é VARCHAR com índice único, que
// compara caixa a caixa. Sem isto, "Joao@Exemplo.com" e
// "joao@exemplo.com" viram dois cadastros do mesmo cliente.
function normalizarEmail(email: string | null | undefined): string | null {
  return email ? email.trim().toLowerCase() : null;
}

export function registrarRotasClientes(app: App): void {
  app.get(
    "/clientes",
    { schema: { querystring: buscaClientes } },
    async (request) => {
      const busca = request.query.busca?.trim();

      const clientes = await prisma.cliente.findMany({
        where: {
          // Sempre o barbeariaId do token. É o filtro que faz a agenda
          // de clientes de uma barbearia ser invisível pras outras.
          barbeariaId: request.user.barbeariaId,
          ...(busca
            ? {
                OR: [
                  // `mode: "insensitive"` só existe no conector do
                  // Postgres — é o que faz "jo" achar "João".
                  { nome: { contains: busca, mode: "insensitive" as const } },
                  { telefone: { contains: busca } },
                ],
              }
            : {}),
        },
        orderBy: { nome: "asc" },
        // Teto de segurança: a tela é uma lista com busca, não um dump.
        take: 200,
      });

      return { clientes: clientes.map(serializarCliente) };
    }
  );

  app.post(
    "/clientes",
    { schema: { body: corpoNovoCliente } },
    async (request, reply) => {
      const { nome, telefone, email } = request.body;

      // Telefone repetido na mesma barbearia bate no unique
      // [barbeariaId, telefone] e vira P2002 -> 409 pelo tratador
      // central. Em barbearias diferentes passa, de propósito.
      const cliente = await prisma.cliente.create({
        data: {
          barbeariaId: request.user.barbeariaId,
          nome,
          telefone,
          email: normalizarEmail(email),
        },
      });

      return reply.code(201).send(serializarCliente(cliente));
    }
  );
}
