import { prisma } from "@gr-barber/database";
import { criarAgendamento } from "../lib/agendamento";
import { naoEncontrado } from "../lib/erro-http";
import {
  PADRAO_DATA,
  PADRAO_HORA,
  PADRAO_TELEFONE,
  PADRAO_UUID,
} from "../lib/padroes";
import {
  serializarAgendamento,
  serializarAgendamentoComCliente,
} from "../lib/serializar";
import type { App } from "../tipos";

// Sem `barbeariaId` e sem `origem`: os dois seriam forjáveis. O
// barbeariaId sai do token e a origem é fixa em "barbeiro" — é o que
// separa o walk-in do agendamento que o cliente fez sozinho, e a tela de
// Agenda distingue os dois.
const corpoNovoAgendamento = {
  type: "object",
  additionalProperties: false,
  required: ["barbeiroId", "clienteId", "servicoIds", "data", "horaInicio"],
  properties: {
    barbeiroId: { type: "string", pattern: PADRAO_UUID },
    clienteId: { type: "string", pattern: PADRAO_UUID },
    servicoIds: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string", pattern: PADRAO_UUID },
    },
    data: { type: "string", pattern: PADRAO_DATA },
    horaInicio: { type: "string", pattern: PADRAO_HORA },
    observacoes: { type: "string", maxLength: 500 },
  },
} as const;

const paramsSlug = {
  type: "object",
  required: ["slug"],
  additionalProperties: false,
  properties: { slug: { type: "string", pattern: "^[a-z0-9-]{3,80}$" } },
} as const;

// Sem `clienteId`: quem agenda pelo link não tem conta nem sabe o id de
// ninguém. Manda nome e telefone, e o telefone é o que casa com um
// cadastro existente daquela barbearia.
const corpoNovoAgendamentoPublico = {
  type: "object",
  additionalProperties: false,
  required: ["barbeiroId", "servicoIds", "data", "horaInicio", "cliente"],
  properties: {
    barbeiroId: { type: "string", pattern: PADRAO_UUID },
    servicoIds: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string", pattern: PADRAO_UUID },
    },
    data: { type: "string", pattern: PADRAO_DATA },
    horaInicio: { type: "string", pattern: PADRAO_HORA },
    cliente: {
      type: "object",
      additionalProperties: false,
      required: ["nome", "telefone"],
      properties: {
        nome: { type: "string", minLength: 2, maxLength: 120 },
        telefone: { type: "string", pattern: PADRAO_TELEFONE, maxLength: 20 },
      },
    },
    observacoes: { type: "string", maxLength: 500 },
  },
} as const;

export function registrarRotasAgendamentos(app: App): void {
  app.post(
    "/agendamentos",
    { schema: { body: corpoNovoAgendamento } },
    async (request, reply) => {
      const barbeariaId = request.user.barbeariaId;
      const { clienteId, ...resto } = request.body;

      const agendamento = await prisma.$transaction(async (tx) => {
        // O cliente também tem que ser desta barbearia. Mesma resposta
        // que GET /clientes/:id dá pro cliente alheio: 404, sem
        // confirmar que o id existe em algum lugar da plataforma.
        const cliente = await tx.cliente.findFirst({
          where: { id: clienteId, barbeariaId },
          select: { id: true },
        });
        if (!cliente) throw naoEncontrado("cliente não encontrado");

        return criarAgendamento(tx, {
          ...resto,
          barbeariaId,
          clienteId,
          origem: "barbeiro",
        });
      });

      return reply.code(201).send(serializarAgendamentoComCliente(agendamento));
    }
  );
}

// Pública: é a tela "Confirma e agenda", aberta pelo link do WhatsApp.
// Fica fora do escopo protegido do app.ts.
export function registrarRotasAgendamentosPublicas(app: App): void {
  app.post(
    "/barbearias/:slug/agendamentos",
    { schema: { params: paramsSlug, body: corpoNovoAgendamentoPublico } },
    async (request, reply) => {
      const { cliente: dadosCliente, ...resto } = request.body;

      const agendamento = await prisma.$transaction(async (tx) => {
        // findUniqueOrThrow: slug inexistente vira P2025 -> 404.
        const barbearia = await tx.barbearia.findUniqueOrThrow({
          where: { slug: request.params.slug },
          select: { id: true },
        });

        // Telefone já cadastrado nesta barbearia reaproveita o registro
        // — é o que faz o barbeiro reconhecer o cliente recorrente.
        //
        // `update: {}` vazio de propósito: nome divergente NÃO
        // sobrescreve o cadastrado. Quem digita o nome abreviado no
        // celular não renomeia o cadastro que o barbeiro ajustou.
        const cliente = await tx.cliente.upsert({
          where: {
            barbeariaId_telefone: {
              barbeariaId: barbearia.id,
              telefone: dadosCliente.telefone,
            },
          },
          create: {
            barbeariaId: barbearia.id,
            nome: dadosCliente.nome,
            telefone: dadosCliente.telefone,
          },
          update: {},
        });

        // Mesma transação do upsert: agendamento recusado desfaz o
        // cliente recém-criado junto, senão cada tentativa inválida
        // deixaria um cadastro fantasma.
        return criarAgendamento(tx, {
          ...resto,
          barbeariaId: barbearia.id,
          clienteId: cliente.id,
          origem: "cliente",
        });
      });

      // Só o agendamento recém-criado, sem o cliente e sem histórico:
      // quem sabe o telefone de alguém não pode puxar a agenda dessa
      // pessoa por aqui.
      return reply.code(201).send(serializarAgendamento(agendamento));
    }
  );
}
