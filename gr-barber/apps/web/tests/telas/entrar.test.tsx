import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { ProvedorDaApi } from "../../src/api/ProvedorDaApi";
import { Entrar } from "../../src/telas/Entrar";
import { sessaoDoCliente } from "../../src/sessao/armazenamento";
import { navegacaoFalsa } from "../ajudantes/navegacao";

function montar(falso = criarApiClientFalso()) {
  render(
    <ProvedorDaApi valor={falso}>
      <Entrar />
    </ProvedorDaApi>
  );
  return falso;
}

async function preencher() {
  await userEvent.type(screen.getByLabelText(/telefone/i), "11999998888");
  await userEvent.type(screen.getByLabelText(/senha/i), "segredo123");
}

describe("entrar", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir();
  });

  it("entra e guarda o token daquela barbearia", async () => {
    montar();
    await preencher();

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(sessaoDoCliente("gr-barber").ler()).toBe("jwt-falso-cliente")
    );
    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/gr-barber/minha-conta");
  });

  it("traduz nao_autenticado em telefone ou senha incorretos", async () => {
    const falso = criarApiClientFalso();
    falso.publico.loginCliente = async () => {
      throw new ErroDaApi(401, "nao_autenticado", "");
    };
    montar(falso);
    await preencher();

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.getByText(/telefone ou senha incorretos/i)).toBeInTheDocument()
    );
  });

  it("no primeiro acesso cria a senha e entra", async () => {
    montar();
    await userEvent.type(screen.getByLabelText(/nome/i), "Maria");
    await preencher();

    await userEvent.click(screen.getByRole("button", { name: /primeiro acesso/i }));

    await waitFor(() =>
      expect(sessaoDoCliente("gr-barber").ler()).toBe("jwt-falso-cliente")
    );
  });

  it("traduz conflito do primeiro acesso em telefone que já tem senha", async () => {
    // Não existe rota pública que diga se um telefone tem senha, e é de
    // propósito — seria a sondagem que o 409 do signup já permite. A
    // tela reage ao que a API responde.
    const falso = criarApiClientFalso();
    falso.publico.signupCliente = async () => {
      throw new ErroDaApi(409, "conflito", "esse telefone já tem conta");
    };
    montar(falso);
    await userEvent.type(screen.getByLabelText(/nome/i), "Maria");
    await preencher();

    await userEvent.click(screen.getByRole("button", { name: /primeiro acesso/i }));

    await waitFor(() =>
      expect(screen.getByText(/já tem senha/i)).toBeInTheDocument()
    );
  });

  it("telefone sem DDD acusa o campo, e não tenta o login", async () => {
    // O ponto da nota 3: um telefone incompleto é erro de digitação, e
    // não pode aparecer como se a senha estivesse errada. Por isso a
    // API nem chega a ser chamada aqui.
    const falso = criarApiClientFalso();
    let tentou = false;
    falso.publico.loginCliente = async () => {
      tentou = true;
      throw new ErroDaApi(401, "nao_autenticado", "");
    };
    montar(falso);

    await userEvent.type(screen.getByLabelText(/telefone/i), "99999");
    await userEvent.type(screen.getByLabelText(/senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/informe o ddd/i)).toBeInTheDocument();
    expect(screen.queryByText(/telefone ou senha incorretos/i)).toBeNull();
    expect(tentou).toBe(false);
  });
});
