import { prisma } from "@gr-barber/database";
import { autenticar } from "../plugins/auth";
import type { App } from "../tipos";

export function registrarRotasMe(app: App): void {
  app.get("/me", { onRequest: [autenticar] }, async (request) => {
    // O id vem do token, nunca da URL ou do corpo — é o que impede um
    // barbeiro de ler o perfil de outro.
    const barbeiro = await prisma.barbeiro.findUniqueOrThrow({
      where: { id: request.user.barbeiroId },
    });

    return {
      id: barbeiro.id,
      nome: barbeiro.nome,
      email: barbeiro.email,
      telefone: barbeiro.telefone,
      barbeariaId: barbeiro.barbeariaId,
    };
  });
}
