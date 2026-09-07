import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarApiClientFalso, ErroDaApi, type EdicaoDoAgendamento } from "@gr-barber/api-client";
import { DetalheDoAgendamento } from "../../../src/telas/painel/DetalheDoAgendamento";
import { navegacaoFalsa } from "../../ajudantes/navegacao";
import { montarPainel } from "../../ajudantes/painel";

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
        horaInicio: "09:00",
        horaFim: "09:30",
        status: "pendente",
        origem: "cliente",
        observacoes: null,
        servicos: [
          { servicoId: "s1", nome: "Corte", precoNoMomento: "40.00", duracaoNoMomento: 30 },
        ],
      },
    ],
  });
}

describe("detalhe do agendamento", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({
      pathname: "/painel/agendamentos/a1",
      params: { id: "a1" },
    });
  });

  it("mostra cliente, serviços e o preço congelado", async () => {
    montarPainel(<DetalheDoAgendamento />, semear());

    expect(await screen.findByText(/João Silva/)).toBeInTheDocument();
    // precoNoMomento, não o preço de hoje: é o que foi combinado com
    // aquele cliente naquele dia.
    expect(screen.getByText("R$ 40,00")).toBeInTheDocument();
  });

  it("muda o status", async () => {
    const falso = semear();
    // O original e capturado ANTES da troca: `montarPainel` passa
    // `falso.barbeiro` por referencia, entao dentro do mock
    // `falso.barbeiro.atualizarAgendamento` ja resolveria para o proprio
    // mock — recursao infinita que o catch da tela engole, deixando o
    // teste verde sem nunca provar que a chamada real aconteceu.
    const original = falso.barbeiro.atualizarAgendamento;
    const atualizar = vi.fn(
      async (id: string, edicao: EdicaoDoAgendamento) =>
        original(id, edicao)
    );
    falso.barbeiro.atualizarAgendamento = atualizar;

    montarPainel(<DetalheDoAgendamento />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /confirmado/i }));

    await waitFor(() => expect(atualizar).toHaveBeenCalledWith("a1", { status: "confirmado" }));
  });

  it("salva observações", async () => {
    const falso = semear();
    // O original e capturado ANTES da troca: `montarPainel` passa
    // `falso.barbeiro` por referencia, entao dentro do mock
    // `falso.barbeiro.atualizarAgendamento` ja resolveria para o proprio
    // mock — recursao infinita que o catch da tela engole, deixando o
    // teste verde sem nunca provar que a chamada real aconteceu.
    const original = falso.barbeiro.atualizarAgendamento;
    const atualizar = vi.fn(
      async (id: string, edicao: EdicaoDoAgendamento) =>
        original(id, edicao)
    );
    falso.barbeiro.atualizarAgendamento = atualizar;

    montarPainel(<DetalheDoAgendamento />, falso);

    await userEvent.type(await screen.findByLabelText(/observações/i), "cliente atrasa");
    await userEvent.click(screen.getByRole("button", { name: /salvar observações/i }));

    await waitFor(() =>
      expect(atualizar).toHaveBeenCalledWith("a1", { observacoes: "cliente atrasa" })
    );
  });

  it("diz que remarcar é cancelar e criar, sem oferecer botão que a API recusaria", async () => {
    // PATCH /agendamentos/:id aceita só status e observacoes; remarcar
    // existe apenas no escopo do cliente.
    montarPainel(<DetalheDoAgendamento />, semear());

    expect(await screen.findByText(/para mudar o horário, cancele e crie outro/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remarcar/i })).not.toBeInTheDocument();
  });

  it("agendamento inexistente vira aviso, não tela em branco", async () => {
    navegacaoFalsa.redefinir({
      pathname: "/painel/agendamentos/a9",
      params: { id: "a9" },
    });
    montarPainel(<DetalheDoAgendamento />, semear());

    expect(await screen.findByText(/agendamento não encontrado/i)).toBeInTheDocument();
  });

  // O dublê de `agendamento(id)` devolve, para o 404, a mesma frase
  // ("agendamento não encontrado") que a tela mostraria mesmo sem
  // ramificar por `codigo` — bastaria exibir `erro.mensagem` cru. O
  // teste acima não prova, sozinho, que a tela lê `codigo`: prova
  // apenas que *alguma* mensagem com essas palavras apareceu. Este
  // teste força um `mensagem` vazio no erro, então só a ramificação por
  // `codigo === "nao_encontrado"` pode produzir o texto esperado —
  // remover ou inverter essa ramificação mostraria uma tela em branco.
  it("a mensagem de agendamento não encontrado vem do código, não do texto cru da API", async () => {
    const falso = semear();
    falso.barbeiro.agendamento = vi.fn(async () => {
      throw new ErroDaApi(404, "nao_encontrado", "");
    });

    montarPainel(<DetalheDoAgendamento />, falso);

    expect(await screen.findByText(/agendamento não encontrado/i)).toBeInTheDocument();
  });
});
