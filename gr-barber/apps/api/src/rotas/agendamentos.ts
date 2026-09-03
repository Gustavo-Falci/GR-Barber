import { prisma } from "@gr-barber/database";
import { criarAgendamento } from "../lib/agendamento";
import { naoEncontrado } from "../lib/erro-http";
import { PADRAO_DATA, PADRAO_HORA, PADRAO_UUID } from "../lib/padroes";
import { serializarAgendamentoComCliente } from "../lib/serializar";
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
