import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso } from "@gr-barber/api-client";
import { AgendaDoDia } from "../../../src/telas/painel/AgendaDoDia";
import { navegacaoFalsa } from "../../ajudantes/navegacao";
import { montarPainel } from "../../ajudantes/painel";

const AGORA = new Date("2026-09-08T10:00:00-03:00");

function semear() {
  return criarApiClientFalso({
    clientes: [
      { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
    ],
    agendamentos: [
      {
        id: "a1",
        clienteId: "c1",
        data: "2026-09-08",
        horaInicio: "11:00",
        horaFim: "11:30",
        status: "confirmado",
        origem: "cliente",
        observacoes: null,
        servicos: [
          { servicoId: "s1", nome: "Corte", precoNoMomento: "40.00", duracaoNoMomento: 30 },
        ],
      },
    ],
  });
}

describe("agenda do dia", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({
      pathname: "/painel/agenda",
      query: { data: "2026-09-08" },
    });
  });

  it("mostra o agendamento na faixa em que ele começa", async () => {
    montarPainel(<AgendaDoDia agora={AGORA} />, semear());

    expect(await screen.findByText(/João Silva/)).toBeInTheDocument();
  });

  it("faixa livre no futuro leva ao novo agendamento com data e hora", async () => {
    montarPainel(<AgendaDoDia agora={AGORA} />, semear());

    await userEvent.click(await screen.findByRole("button", { name: /11:30/ }));

    expect(navegacaoFalsa.push).toHaveBeenCalledWith(
      "/painel/agendamentos/novo?data=2026-09-08&hora=11%3A30"
    );
  });

  it("faixa de hoje que já passou não oferece criar", async () => {
    montarPainel(<AgendaDoDia agora={AGORA} />, semear());

    await screen.findByText(/João Silva/);
    expect(screen.queryByRole("button", { name: /09:00/ })).not.toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("clicar num dia da faixa de semana troca a data na URL", async () => {
    montarPainel(<AgendaDoDia agora={AGORA} />, semear());

    await userEvent.click(await screen.findByRole("button", { name: /quarta/i }));

    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel/agenda?data=2026-09-09");
  });

  it("sem ?data= na URL, mostra hoje", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/agenda" });
    montarPainel(<AgendaDoDia agora={AGORA} />, semear());

    expect(await screen.findByText(/João Silva/)).toBeInTheDocument();
  });
});
