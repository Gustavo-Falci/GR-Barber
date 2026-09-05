import { prisma } from "@gr-barber/database";
import { clienteDoToken } from "../plugins/auth";
import { normalizarEmail } from "../lib/email";
import { PADRAO_EMAIL } from "../lib/padroes";
import { serializarCliente } from "../lib/serializar";
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
}
