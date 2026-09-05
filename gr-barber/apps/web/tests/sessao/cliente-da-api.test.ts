import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiDoBarbeiro } from "../../src/sessao/cliente-da-api";
import { sessaoDoBarbeiro } from "../../src/sessao/armazenamento";

describe("api do barbeiro ligada à sessão", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("limpa o token guardado quando a API responde 401", async () => {
    // Token de 7 dias com hook que consulta o banco a cada requisição:
    // 401 no meio da sessão é evento normal, e a tela precisa voltar
    // pro login com o armazenamento já limpo.
    sessaoDoBarbeiro.gravar("jwt-vencido");

    const fetchFalso = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ erro: "nao_autenticado" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
    );

    const api = apiDoBarbeiro(fetchFalso as unknown as typeof globalThis.fetch);

    await expect(api.meuPerfil()).rejects.toThrow();
    expect(sessaoDoBarbeiro.ler()).toBeNull();
  });
});
