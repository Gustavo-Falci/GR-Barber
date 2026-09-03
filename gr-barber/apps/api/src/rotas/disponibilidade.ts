import { prisma } from "@gr-barber/database";
import {
  carregarServicos,
  garantirBarbeiro,
  horariosLivres,
} from "../lib/disponibilidade";
import { ErroDeNegocio } from "../lib/erro-negocio";
import { dataParaDate } from "../lib/horas";
import { PADRAO_DATA, PADRAO_UUID } from "../lib/padroes";
import type { App } from "../tipos";

const paramsSlug = {
  type: "object",
  required: ["slug"],
  additionalProperties: false,
  properties: { slug: { type: "string", pattern: "^[a-z0-9-]{3,80}$" } },
} as const;

// `servicoIds` vem repetido na query (`?servicoIds=a&servicoIds=b`). Um
// valor só também chega como array: o coerceTypes do AJV embrulha o
// escalar sozinho — medido, ver o plano da fase 5.
const filtroDia = {
  type: "object",
  additionalProperties: false,
  required: ["barbeiroId", "data", "servicoIds"],
  properties: {
    barbeiroId: { type: "string", pattern: PADRAO_UUID },
    data: { type: "string", pattern: PADRAO_DATA },
    servicoIds: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string", pattern: PADRAO_UUID },
    },
  },
} as const;

// O pattern garante a forma "YYYY-MM-DD", não que a data exista:
// "2026-02-31" passa por ele e explode no dataParaDate. Sem este
// wrapper seria um RangeError não tratado, ou seja, 500 por culpa de
// quem chamou.
function dataDaQuery(valor: string): Date {
  try {
    return dataParaDate(valor);
  } catch {
    throw new ErroDeNegocio(`a data ${valor} não existe`, "data_invalida");
  }
}

// Públicas: são as telas de escolha de data e de horário, abertas pelo
// link do WhatsApp. Ficam fora do escopo protegido do app.ts.
export function registrarRotasDisponibilidade(app: App): void {
  app.get(
    "/barbearias/:slug/disponibilidade",
    { schema: { params: paramsSlug, querystring: filtroDia } },
    async (request) => {
      const { barbeiroId, data, servicoIds } = request.query;

      // findUniqueOrThrow: slug inexistente vira P2025 -> 404.
      const barbearia = await prisma.barbearia.findUniqueOrThrow({
        where: { slug: request.params.slug },
        select: { id: true },
      });

      await garantirBarbeiro(prisma, barbearia.id, barbeiroId);

      const { duracaoTotalMinutos } = await carregarServicos(
        prisma,
        barbearia.id,
        servicoIds
      );

      const dataDate = dataDaQuery(data);

      const janela = await prisma.horarioFuncionamento.findUnique({
        where: {
          barbeariaId_diaSemana: {
            barbeariaId: barbearia.id,
            diaSemana: dataDate.getUTCDay(),
          },
        },
      });

      // Mesmo filtro que a trava do banco usa: cancelado não ocupa.
      const ocupados = await prisma.agendamento.findMany({
        where: { barbeiroId, data: dataDate, status: { not: "cancelado" } },
        select: { horaInicio: true, horaFim: true },
      });

      return {
        horarios: horariosLivres({ janela, ocupados, duracaoTotalMinutos }),
      };
    }
  );
}
