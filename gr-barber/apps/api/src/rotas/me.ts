import { prisma } from "@gr-barber/database";
import type { App } from "../tipos";

// Sem `onRequest` aqui: quem autentica é o escopo das rotas protegidas,
// no app.ts. Ver o comentário lá.
export function registrarRotasMe(app: App): void {
  app.get("/me", async (request) => {
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
