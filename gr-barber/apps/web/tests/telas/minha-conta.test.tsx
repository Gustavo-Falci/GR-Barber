import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { ProvedorDaApi } from "../../src/api/ProvedorDaApi";
import { MinhaConta } from "../../src/telas/MinhaConta";
import { sessaoDoCliente } from "../../src/sessao/armazenamento";
import { navegacaoFalsa } from "../ajudantes/navegacao";

async function comUmAgendamento() {
  const falso = criarApiClientFalso();
  await falso.publico.agendar("gr-barber", {
    barbeiroId: "bb1",
    servicoIds: ["s1"],
    data: "2026-09-20",
    horaInicio: "09:30",
    cliente: { nome: "João", telefone: "(11) 99999-8888" },
  });
  return falso;
}

function montar(falso: ReturnType<typeof criarApiClientFalso>) {
  render(
    <ProvedorDaApi valor={falso}>
      <MinhaConta />
    </ProvedorDaApi>
  );
}

describe("minha conta", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir();
    sessaoDoCliente("gr-barber").gravar("jwt-do-cliente");
  });

  it("lista os agendamentos com data, hora e status", async () => {
    montar(await comUmAgendamento());

    await waitFor(() => screen.getByText("20 de setembro"));
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText(/pendente/i)).toBeInTheDocument();
  });

  it("cancela e atualiza a lista", async () => {
    montar(await comUmAgendamento());
    await waitFor(() => screen.getByText("20 de setembro"));

    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    await waitFor(() =>
      expect(screen.getByText(/cancelado/i)).toBeInTheDocument()
    );
  });

  it("remarcar leva pro passo de data com o id na query", async () => {
    const falso = await comUmAgendamento();
    montar(falso);
    await waitFor(() => screen.getByText("20 de setembro"));

    await userEvent.click(screen.getByRole("button", { name: /remarcar/i }));

    expect(navegacaoFalsa.push).toHaveBeenCalledWith(
      "/gr-barber/agendar/data?servicos=s1&remarcar=a1"
    );
  });

  it("manda pro entrar quando não há sessão", async () => {
    localStorage.clear();
    montar(criarApiClientFalso());

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/gr-barber/entrar")
    );
  });

  it("manda pro entrar quando a API responde 401", async () => {
    // Token de sete dias, e o hook da API consulta o banco a cada
    // requisição: 401 no meio da sessão é evento normal.
    const falso = criarApiClientFalso();
    falso.cliente.meusAgendamentos = async () => {
      throw new ErroDaApi(401, "nao_autenticado", "");
    };
    montar(falso);

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/gr-barber/entrar")
    );
  });
});
