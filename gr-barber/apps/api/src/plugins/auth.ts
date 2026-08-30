import fastifyJwt from "@fastify/jwt";
import type { FastifyRequest } from "fastify";
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
    throw new Error("JWT_SECRET não definido — confira o .env da API");
  }

  app.register(fastifyJwt, { secret: segredo });
}

// Hook onRequest das rotas protegidas. Token ausente ou inválido faz o
// jwtVerify lançar com statusCode 401, que o tratador de erros repassa.
export async function autenticar(request: FastifyRequest): Promise<void> {
  await request.jwtVerify();
}
