import { prisma } from "@gr-barber/database";
import { normalizarEmail } from "../lib/email";
import { PADRAO_EMAIL, PADRAO_TELEFONE, PADRAO_UUID } from "../lib/padroes";
import { serializarAgendamento, serializarCliente } from "../lib/serializar";
import {
  apenasDigitos,
  normalizarTelefoneObrigatorio,
} from "../lib/telefone";
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

const paramsComId = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: { id: { type: "string", pattern: PADRAO_UUID } },
} as const;

const corpoPatchCliente = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
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

export function registrarRotasClientes(app: App): void {
  app.get(
    "/clientes",
    { schema: { querystring: buscaClientes } },
    async (request) => {
      const busca = request.query.busca?.trim();
      const digitos = busca ? apenasDigitos(busca) : "";

      // A coluna guarda o telefone pontuado — "(11) 99999-8888" — então
      // procurar "999998888" cru com `contains` nunca casaria. O
      // regexp_replace tira a pontuação do lado do banco, e a busca
      // compara dígito com dígito: qualquer jeito de digitar o número
      // acha o mesmo cliente. Vai em SQL porque o Prisma não expressa
      // função sobre coluna dentro de um `where`.
      const porTelefone = digitos
        ? await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM cliente
            WHERE barbearia_id = ${request.user.barbeariaId}::uuid
              AND regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${`%${digitos}%`}
            LIMIT 200
          `
        : [];

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
                  { id: { in: porTelefone.map((linha) => linha.id) } },
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
          telefone: normalizarTelefoneObrigatorio(telefone),
          email: normalizarEmail(email),
        },
      });

      return reply.code(201).send(serializarCliente(cliente));
    }
  );

  app.get(
    "/clientes/:id",
    { schema: { params: paramsComId } },
    async (request) => {
      const barbeariaId = request.user.barbeariaId;

      // findFirstOrThrow e não findUnique: o filtro por barbearia entra
      // na mesma consulta, e "cliente de outra barbearia" cai no mesmo
      // P2025 que "cliente que não existe" — 404 nos dois casos, de
      // propósito.
      const cliente = await prisma.cliente.findFirstOrThrow({
        where: { id: request.params.id, barbeariaId },
        include: {
          agendamentos: {
            // Redundante hoje, já que o cliente pertence a uma barbearia
            // só. Fica porque é barato e porque o dia em que um cliente
            // circular entre barbearias, o histórico não vaza junto.
            where: { barbeariaId },
            orderBy: [{ data: "desc" }, { horaInicio: "desc" }],
            take: 50,
            include: {
              servicos: { include: { servico: { select: { nome: true } } } },
            },
          },
        },
      });

      return {
        ...serializarCliente(cliente),
        agendamentos: cliente.agendamentos.map(serializarAgendamento),
      };
    }
  );

  app.patch(
    "/clientes/:id",
    { schema: { params: paramsComId, body: corpoPatchCliente } },
    async (request) => {
      const { nome, telefone, email } = request.body;

      const cliente = await prisma.cliente.update({
        // barbeariaId no mesmo where da escrita: cliente de outra
        // barbearia vira P2025 -> 404, nunca uma edição silenciosa.
        where: { id: request.params.id, barbeariaId: request.user.barbeariaId },
        data: {
          ...(nome !== undefined ? { nome } : {}),
          // Mesmo tratamento do email: só entra no `data` quando veio no
          // corpo, e sempre normalizado — os dois escrevem numa coluna
          // que faz parte de uma chave única.
          // `Obrigatorio` e não o normalizarTelefone puro: diferente da
          // barbearia e do barbeiro, `Cliente.telefone` é NOT NULL no
          // schema, e o corpo desta rota não aceita null — quem entrega
          // isso ao compilador é o retorno `string` do wrapper.
          ...(telefone !== undefined
            ? { telefone: normalizarTelefoneObrigatorio(telefone) }
            : {}),
          // `email` tem tratamento próprio porque passa pela
          // normalização — e porque `null` aqui significa "limpar", não
          // "não mexer".
          ...(email !== undefined ? { email: normalizarEmail(email) } : {}),
        },
      });

      return serializarCliente(cliente);
    }
  );
}
