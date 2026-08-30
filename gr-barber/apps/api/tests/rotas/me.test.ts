import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import type { App } from "../../src/tipos";

const CADASTRO = {
  barbearia: { nome: "Barbearia do Gu", slug: "barbearia-do-gu" },
  barbeiro: { nome: "Gustavo", email: "gu@exemplo.com", senha: "senha-forte-123" },
};

async function cadastrarEObterToken(app: App): Promise<string> {
  const resposta = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: CADASTRO,
  });
  return resposta.json().token;
}

describe("GET /me", () => {
  it("devolve o barbeiro do token", async () => {
    const app = buildApp();
    const token = await cadastrarEObterToken(app);

    const resposta = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(resposta.statusCode).toBe(200);

    const corpo = resposta.json();
    expect(corpo.nome).toBe("Gustavo");
    expect(corpo.email).toBe("gu@exemplo.com");
    expect(typeof corpo.barbeariaId).toBe("string");

    await app.close();
  });

  it("nunca devolve senhaHash", async () => {
    const app = buildApp();
    const token = await cadastrarEObterToken(app);

    const resposta = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(resposta.body).not.toContain("scrypt$");
    expect(resposta.json()).not.toHaveProperty("senhaHash");

    await app.close();
  });

  it("recusa requisição sem token com 401", async () => {
    const app = buildApp();
    const resposta = await app.inject({ method: "GET", url: "/me" });

    expect(resposta.statusCode).toBe(401);
    // Código de domínio, não o nome interno do @fastify/jwt.
    expect(resposta.json()).toEqual({ erro: "nao_autenticado" });

    await app.close();
  });

  it("recusa token malformado com 401", async () => {
    const app = buildApp();
    const resposta = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer isso-nao-e-um-token" },
    });

    expect(resposta.statusCode).toBe(401);

    await app.close();
  });

  it("recusa token com assinatura adulterada", async () => {
    const app = buildApp();
    const token = await cadastrarEObterToken(app);

    // Um JWT é `header.payload.assinatura`. Trocar um caractere da
    // assinatura mantém a forma válida mas quebra a verificação — é o
    // que separa "token bem formado" de "token que confiamos".
    const [cabecalho, conteudo, assinatura] = token.split(".");
    const adulterado = [
      cabecalho,
      conteudo,
      assinatura.startsWith("A") ? `B${assinatura.slice(1)}` : `A${assinatura.slice(1)}`,
    ].join(".");

    const resposta = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${adulterado}` },
    });

    expect(resposta.statusCode).toBe(401);

    await app.close();
  });
});
