import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso } from "@gr-barber/api-client";
import { ProvedorDaApi } from "../../src/api/ProvedorDaApi";
import { Confirmacao } from "../../src/telas/Confirmacao";
import { gravarDadosDoCliente, lerDadosDoCliente } from "../../src/fluxo/dadosDoCliente";
import { navegacaoFalsa } from "../ajudantes/navegacao";

function montar(falso = criarApiClientFalso()) {
  render(
    <ProvedorDaApi valor={falso}>
      <Confirmacao />
    </ProvedorDaApi>
  );
  return falso;
}

describe("confirmação", () => {
  beforeEach(() => {
    sessionStorage.clear();
    navegacaoFalsa.redefinir({
      query: { servicos: "s1,s2", data: "2026-09-10", hora: "09:00" },
    });
    gravarDadosDoCliente({ nome: "João", telefone: "(11) 99999-8888" });
  });

  it("mostra o resumo do que vai ser agendado", async () => {
    montar();
    await waitFor(() => screen.getByText(/corte/i));

    expect(screen.getByText("10 de setembro")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("R$ 65,00")).toBeInTheDocument();
  });

  it("cria o agendamento e vira tela de sucesso", async () => {
    const falso = montar();
    await waitFor(() => screen.getByRole("button", { name: /confirmar/i }));

    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() =>
      expect(screen.getByText(/agendamento confirmado/i)).toBeInTheDocument()
    );
    expect(falso.estado.agendamentos).toHaveLength(1);
    // Os dados pessoais somem assim que deixam de ser necessários.
    expect(lerDadosDoCliente()).toBeNull();
  });

  it("no horario_ocupado volta pro passo de horário", async () => {
    // A trava do banco pega a corrida depois de a disponibilidade já ter
    // dito que cabia. Repetir o envio daria o mesmo 409: o certo é
    // recarregar a lista.
    const falso = criarApiClientFalso();
    await falso.publico.agendar("gr-barber", {
      barbeiroId: "bb1",
      servicoIds: ["s1"],
      data: "2026-09-10",
      horaInicio: "09:00",
      cliente: { nome: "Outro", telefone: "(11) 98888-7777" },
    });

    montar(falso);
    await waitFor(() => screen.getByRole("button", { name: /confirmar/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() =>
      expect(navegacaoFalsa.push).toHaveBeenCalledWith(
        "/gr-barber/agendar/horario?servicos=s1%2Cs2&data=2026-09-10"
      )
    );
    expect(screen.getByText(/esse horário acabou de ser ocupado/i)).toBeInTheDocument();
  });

  it("volta pro passo de dados quando não há nome e telefone guardados", async () => {
    sessionStorage.clear();
    montar();

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith(
        "/gr-barber/agendar/dados?servicos=s1%2Cs2&data=2026-09-10&hora=09%3A00"
      )
    );
    // Sem asserção não-nula: o botão simplesmente não existe enquanto
    // faltam os dados, em vez de existir e confiar num `!` pra chamar a
    // API sem cliente.
    expect(screen.queryByRole("button", { name: /confirmar/i })).toBeNull();
  });

  it("no remarcar chama remarcar em vez de agendar, sem pedir dados", async () => {
    const falso = criarApiClientFalso();
    const original = await falso.publico.agendar("gr-barber", {
      barbeiroId: "bb1",
      servicoIds: ["s1"],
      data: "2026-09-20",
      horaInicio: "11:00",
      cliente: { nome: "João", telefone: "(11) 99999-8888" },
    });
    sessionStorage.clear();
    navegacaoFalsa.redefinir({
      query: {
        servicos: "s1",
        data: "2026-09-21",
        hora: "10:00",
        remarcar: original.id,
      },
    });

    montar(falso);
    await waitFor(() => screen.getByRole("button", { name: /confirmar/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() =>
      expect(screen.getByText(/agendamento confirmado/i)).toBeInTheDocument()
    );
    const cancelado = falso.estado.agendamentos.find((a) => a.id === original.id);
    expect(cancelado?.status).toBe("cancelado");
  });
});
