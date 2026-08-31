import fastifyJwt from "@fastify/jwt";
import type { FastifyRequest } from "fastify";
import { prisma } from "@gr-barber/database";
import type { App } from "../tipos";

// Tipa o payload do token. Sem isso, request.user seria `any` e o
// escopo por barbearia dependeria de disciplina em vez do compilador.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { barbeiroId: string; barbeariaId: string };
    user: { barbeiroId: string; barbeariaId: string };
  }
}

export function registrarAuth(app: App): void {
  const segredo = process.env.JWT_SECRET;
  if (!segredo) {
    throw new Error("JWT_SECRET não definido — veja apps/api/.env.example");
  }

  // Token com prazo. Com o hook lendo o banco a revogação já é
  // imediata; a expiração é defesa em profundidade contra token
  // roubado. Decidir agora evita retrofitar tratamento de 401 e novo
  // login nas telas depois que elas assumirem token eterno.
  app.register(fastifyJwt, { secret: segredo, sign: { expiresIn: "7d" } });
}

// Hook onRequest das rotas protegidas. Token ausente ou inválido faz o
// jwtVerify lançar com statusCode 401, que o tratador de erros repassa.
export async function autenticar(request: FastifyRequest): Promise<void> {
  await request.jwtVerify();

  // Verificar a assinatura não basta: desativar um barbeiro não tiraria
  // o acesso de quem já tem token na mão. Uma query por requisição
  // protegida é o preço de a desativação ser real.
  const barbeiro = await prisma.barbeiro.findUnique({
    where: { id: request.user.barbeiroId },
    select: { ativo: true },
  });

  if (!barbeiro?.ativo) {
    throw Object.assign(new Error("barbeiro inativo ou inexistente"), {
      statusCode: 401,
    });
  }
}
