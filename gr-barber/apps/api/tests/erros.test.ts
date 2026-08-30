import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { ErroDeNegocio } from "../src/lib/erro-negocio";

describe("tratamento de erros", () => {
  it("traduz ErroDeNegocio pra 422", async () => {
    const app = buildApp();
    app.get("/teste-negocio", async () => {
      throw new ErroDeNegocio("horário indisponível", "horario_indisponivel");
    });

    const resposta = await app.inject({ method: "GET", url: "/teste-negocio" });

    expect(resposta.statusCode).toBe(422);
    expect(resposta.json()).toEqual({
      erro: "horario_indisponivel",
      mensagem: "horário indisponível",
    });

    await app.close();
  });

  it("traduz P2025 do Prisma pra 404", async () => {
    const app = buildApp();
    const resposta = await app.inject({
      method: "GET",
      url: "/barbearias/nao-existe/servicos",
    });

    expect(resposta.statusCode).toBe(404);
    expect(resposta.json()).toEqual({ erro: "nao_encontrado" });

    await app.close();
  });

  it("mantém o 400 da validação de schema do Fastify", async () => {
    const app = buildApp();
    const resposta = await app.inject({
      method: "POST",
      url: "/disponibilidade",
      payload: { duracaoTotalMinutos: 45 },
    });

    expect(resposta.statusCode).toBe(400);

    await app.close();
  });

  it("normaliza qualquer 401 para nao_autenticado", async () => {
    const app = buildApp();
    app.get("/teste-401", async () => {
      // Imita o formato do que o @fastify/jwt lança: statusCode 401 com
      // um code interno do plugin. O contrato da API não deve expor esse
      // nome — as telas ramificariam em cima dele.
      const erro = new Error("token ausente") as Error & {
        statusCode: number;
        code: string;
      };
      erro.statusCode = 401;
      erro.code = "FST_JWT_NO_AUTHORIZATION_IN_HEADER";
      throw erro;
    });

    const resposta = await app.inject({ method: "GET", url: "/teste-401" });

    expect(resposta.statusCode).toBe(401);
    expect(resposta.json()).toEqual({ erro: "nao_autenticado" });
    expect(resposta.body).not.toContain("FST_JWT");

    await app.close();
  });

  it("esconde erro inesperado atrás de 500 genérico", async () => {
    const app = buildApp();
    app.get("/teste-explosao", async () => {
      throw new Error("detalhe interno que não pode vazar");
    });

    const resposta = await app.inject({ method: "GET", url: "/teste-explosao" });

    expect(resposta.statusCode).toBe(500);
    expect(resposta.json()).toEqual({ erro: "erro_interno" });
    expect(resposta.body).not.toContain("detalhe interno");

    await app.close();
  });
});
