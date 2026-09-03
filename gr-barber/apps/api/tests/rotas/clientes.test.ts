import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { auth, criarBarbeariaComToken } from "../helpers/barbearia";

const JOAO = { nome: "João da Silva", telefone: "11999998888" };

describe("POST /clientes", () => {
  it("cadastra o cliente na barbearia do token", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");

    const resposta = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: JOAO,
    });

    expect(resposta.statusCode).toBe(201);
    expect(resposta.json()).toMatchObject({
      nome: "João da Silva",
      telefone: "11999998888",
      email: null,
      // Cliente cadastrado pelo barbeiro não tem conta: o fluxo público
      // não pede senha, e o app com login é passo posterior.
      temConta: false,
    });

    await app.close();
  });

  it("aparece na listagem na hora, sem depender de agendamento", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: JOAO,
    });

    // É o motivo de o Cliente ter ganhado barbeariaId: com o vínculo
    // saindo só do agendamento, este cadastro sumiria da tela até o
    // primeiro atendimento.
    const lista = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: auth(um.token),
    });

    expect(lista.json().clientes).toHaveLength(1);

    await app.close();
  });

  it("normaliza o email pra caixa baixa", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");

    const resposta = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: { ...JOAO, email: "Joao@Exemplo.com" },
    });

    // Mesma razão do login: a coluna é VARCHAR com índice único, que
    // compara caixa a caixa. Sem normalizar, o mesmo email vira dois
    // cadastros.
    expect(resposta.json().email).toBe("joao@exemplo.com");

    await app.close();
  });

  it("recusa telefone repetido na mesma barbearia com 409", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: JOAO,
    });

    const segunda = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: { nome: "João de novo", telefone: "11999998888" },
    });

    expect(segunda.statusCode).toBe(409);
    expect(segunda.json().erro).toBe("conflito");

    await app.close();
  });

  it("aceita o mesmo telefone em barbearias diferentes", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");
    const outra = await criarBarbeariaComToken(app, "outra");

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: JOAO,
    });

    const naOutra = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(outra.token),
      payload: JOAO,
    });

    // O mesmo cliente pode ser cliente das duas barbearias. Um 409 aqui
    // impediria a segunda barbearia de cadastrar quem já é cliente da
    // primeira.
    expect(naOutra.statusCode).toBe(201);

    await app.close();
  });

  it("recusa telefone fora do formato com 400", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");

    const resposta = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: { nome: "João", telefone: "telefone" },
    });

    expect(resposta.statusCode).toBe(400);

    await app.close();
  });

  it("recusa barbeariaId no corpo com 400", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");
    const outra = await criarBarbeariaComToken(app, "outra");

    const resposta = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: { ...JOAO, barbeariaId: outra.barbeariaId },
    });

    expect(resposta.statusCode).toBe(400);

    await app.close();
  });

  it("recusa requisição sem token com 401", async () => {
    const app = buildApp();

    const resposta = await app.inject({
      method: "POST",
      url: "/clientes",
      payload: JOAO,
    });

    expect(resposta.statusCode).toBe(401);

    await app.close();
  });
});

describe("GET /clientes", () => {
  it("lista só os clientes da barbearia do token, em ordem de nome", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");
    const outra = await criarBarbeariaComToken(app, "outra");

    for (const cliente of [
      { nome: "Zeca", telefone: "11911111111" },
      { nome: "Ana", telefone: "11922222222" },
    ]) {
      await app.inject({
        method: "POST",
        url: "/clientes",
        headers: auth(um.token),
        payload: cliente,
      });
    }
    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(outra.token),
      payload: { nome: "Cliente da outra", telefone: "11933333333" },
    });

    const resposta = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: auth(um.token),
    });

    expect(resposta.statusCode).toBe(200);
    expect(
      resposta.json().clientes.map((c: { nome: string }) => c.nome)
    ).toEqual(["Ana", "Zeca"]);

    await app.close();
  });

  it("filtra por parte do nome, sem diferenciar caixa", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: JOAO,
    });
    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: { nome: "Maria", telefone: "11922222222" },
    });

    const resposta = await app.inject({
      method: "GET",
      url: "/clientes?busca=jo",
      headers: auth(um.token),
    });

    expect(resposta.json().clientes).toHaveLength(1);
    expect(resposta.json().clientes[0].nome).toBe("João da Silva");

    await app.close();
  });

  it("filtra por parte do telefone", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: JOAO,
    });

    const resposta = await app.inject({
      method: "GET",
      url: "/clientes?busca=99999",
      headers: auth(um.token),
    });

    expect(resposta.json().clientes).toHaveLength(1);

    await app.close();
  });

  it("nunca devolve senhaHash", async () => {
    const app = buildApp();
    const um = await criarBarbeariaComToken(app, "um");

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: auth(um.token),
      payload: JOAO,
    });

    const resposta = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: auth(um.token),
    });

    expect(resposta.body).not.toContain("senhaHash");

    await app.close();
  });

  it("recusa requisição sem token com 401", async () => {
    const app = buildApp();

    const resposta = await app.inject({ method: "GET", url: "/clientes" });

    expect(resposta.statusCode).toBe(401);

    await app.close();
  });
});
