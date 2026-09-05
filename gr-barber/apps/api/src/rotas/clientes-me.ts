import { prisma } from "@gr-barber/database";
import { clienteDoToken } from "../plugins/auth";
import { normalizarEmail } from "../lib/email";
import { INCLUDE_AGENDAMENTO } from "../lib/agendamento";
import { ErroDeNegocio } from "../lib/erro-negocio";
import { dataParaDate } from "../lib/horas";
import { PADRAO_DATA, PADRAO_EMAIL } from "../lib/padroes";
import { serializarAgendamento, serializarCliente } from "../lib/serializar";
import type { App } from "../tipos";

// Telefone fica de fora: é a chave do login e do upsert do agendamento
// público. Trocar por aqui separaria a conta do histórico sem aviso.
// `additionalProperties: false` é o que transforma "fora da lista" em
// 400 em vez de silêncio.
const corpoPatch = {
  type: "object",
  additionalProperties: false,
  // Corpo vazio seria um UPDATE sem efeito respondendo 200.
  minProperties: 1,
  properties: {
    nome: { type: "string", minLength: 2, maxLength: 120 },
    email: { type: ["string", "null"], pattern: PADRAO_EMAIL, maxLength: 160 },
  },
} as const;

const filtroAgendamentos = {
  type: "object",
  additionalProperties: false,
  properties: {
    de: { type: "string", pattern: PADRAO_DATA },
    ate: { type: "string", pattern: PADRAO_DATA },
  },
} as const;

// O pattern garante a forma "YYYY-MM-DD", não que a data exista:
// "2026-02-31" passa por ele e explode no dataParaDate. Sem este
// wrapper seria um RangeError não tratado, ou seja, 500 por culpa de
// quem chamou.
function dataDoFiltro(valor: string): Date {
  try {
    return dataParaDate(valor);
  } catch {
    throw new ErroDeNegocio(`a data ${valor} não existe`, "data_invalida");
  }
}

// Sem `onRequest` aqui: quem autentica é o escopo do cliente, no app.ts.
export function registrarRotasClientesMe(app: App): void {
  app.get("/clientes/me", async (request) => {
    const { clienteId } = clienteDoToken(request);

    // O id vem do token, nunca da URL — é o que impede um cliente de
    // ler o cadastro de outro.
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { id: clienteId },
    });

    return { cliente: serializarCliente(cliente) };
  });

  app.patch("/clientes/me", { schema: { body: corpoPatch } }, async (request) => {
    const { clienteId } = clienteDoToken(request);
    const { nome, email } = request.body;

    const cliente = await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        // `email` tem tratamento próprio porque passa pela
        // normalização — e porque `null` aqui significa "limpar", não
        // "não mexer". `!== undefined` distingue "campo ausente" (não
        // mexe) de "campo presente" (grava, mesmo que seja null).
        ...(email !== undefined ? { email: normalizarEmail(email) } : {}),
      },
    });

    return { cliente: serializarCliente(cliente) };
  });

  app.get(
    "/clientes/me/agendamentos",
    { schema: { querystring: filtroAgendamentos } },
    async (request) => {
      const { clienteId } = clienteDoToken(request);
      const { de, ate } = request.query;

      const agendamentos = await prisma.agendamento.findMany({
        where: {
          // O clienteId sai do token, nunca da query: é o que faz o
          // histórico de outra pessoa ser inalcançável, e não só
          // escondido.
          clienteId,
          ...(de || ate
            ? {
                data: {
                  ...(de ? { gte: dataDoFiltro(de) } : {}),
                  ...(ate ? { lte: dataDoFiltro(ate) } : {}),
                },
              }
            : {}),
        },
        include: INCLUDE_AGENDAMENTO,
        // Mais recente primeiro: a tela "Meus agendamentos" abre no que
        // está por vir, não no corte do ano passado.
        orderBy: [{ data: "desc" }, { horaInicio: "desc" }],
      });

      return { agendamentos: agendamentos.map(serializarAgendamento) };
    }
  );
}
