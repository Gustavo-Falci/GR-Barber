import { describe, expect, it } from "vitest";
import { prisma } from "@gr-barber/database";
import { buildApp } from "../../src/app";
import { criarBarbeariaComToken } from "../helpers/barbearia";
import { decodificarPayload } from "../helpers/decodificar-token";

const SENHA = "senha-forte-123";

describe("POST /barbearias/:slug/auth/cliente/signup", () => {
  it("cria o cadastro quando o telefone é novo", async () => {
    const app = buildApp();
    const { slug, barbeariaId } = await criarBarbeariaComToken(app);

    const resposta = await app.inject({
      method: "POST",
      url: `/barbearias/${slug}/auth/cliente/signup`,
      payload: { nome: "João da Silva", telefone: "11999998888", senha: SENHA },
    });

    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().cliente).toMatchObject({
      nome: "João da Silva",
      telefone: "11999998888",
      temConta: true,
    });

    const payload = decodificarPayload(resposta.json().token);
    expect(payload.tipo).toBe("cliente");
    expect(payload.barbeariaId).toBe(barbeariaId);
  });

  it("define a senha de um cadastro que já existe sem senha", async () => {
    const app = buildApp();
    const { slug, barbeariaId } = await criarBarbeariaComToken(app);

    // É o cadastro que o upsert do agendamento público cria: sem senha,
    // e com o nome que o barbeiro registrou.
    const existente = await prisma.cliente.create({
      data: { barbeariaId, nome: "João Silva", telefone: "11999998888" },
    });

    const resposta = await app.inject({
      method: "POST",
      url: `/barbearias/${slug}/auth/cliente/signup`,
      payload: { nome: "Jo", telefone: "11999998888", senha: SENHA },
    });

    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().cliente.id).toBe(existente.id);
    // O nome do signup NÃO sobrescreve: mesma regra do `update: {}` do
    // upsert público, pra quem digita abreviado no celular não renomear
    // o cadastro que o barbeiro ajustou.
    expect(resposta.json().cliente.nome).toBe("João Silva");
  });

  it("recusa quando o cadastro já tem senha", async () => {
    const app = buildApp();
    const { slug } = await criarBarbeariaComToken(app);
    const payload = {
      nome: "João da Silva",
      telefone: "11999998888",
      senha: SENHA,
    };

    await app.inject({
      method: "POST",
      url: `/barbearias/${slug}/auth/cliente/signup`,
      payload,
    });

    const segunda = await app.inject({
      method: "POST",
      url: `/barbearias/${slug}/auth/cliente/signup`,
      payload,
    });

    expect(segunda.statusCode).toBe(409);
    expect(segunda.json().erro).toBe("conflito");
  });

  it("nunca devolve o senhaHash", async () => {
    const app = buildApp();
    const { slug } = await criarBarbeariaComToken(app);

    const resposta = await app.inject({
      method: "POST",
      url: `/barbearias/${slug}/auth/cliente/signup`,
      payload: { nome: "João da Silva", telefone: "11999998888", senha: SENHA },
    });

    expect(resposta.body).not.toContain("scrypt");
    expect(resposta.json().cliente.senhaHash).toBeUndefined();
  });

  it("404 em slug que não existe", async () => {
    const app = buildApp();

    const resposta = await app.inject({
      method: "POST",
      url: "/barbearias/nao-existe/auth/cliente/signup",
      payload: { nome: "João da Silva", telefone: "11999998888", senha: SENHA },
    });

    expect(resposta.statusCode).toBe(404);
  });
});
