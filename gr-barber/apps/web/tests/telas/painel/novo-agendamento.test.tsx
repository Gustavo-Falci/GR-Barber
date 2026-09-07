import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { NovoAgendamento } from "../../../src/telas/painel/NovoAgendamento";
import { navegacaoFalsa } from "../../ajudantes/navegacao";
import { montarPainel } from "../../ajudantes/painel";

const AGORA = new Date("2026-09-08T10:00:00-03:00");

function semear() {
  return criarApiClientFalso({
    clientes: [
      { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
    ],
    horariosLivres: ["11:00", "11:30", "12:00"],
  });
}

describe("novo agendamento no painel", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({
      pathname: "/painel/agendamentos/novo",
      query: { data: "2026-09-09", hora: "11:00" },
    });
  });

  it("chega preenchido pela URL que a agenda montou", async () => {
    montarPainel(<NovoAgendamento agora={AGORA} />, semear());

    expect(await screen.findByRole("button", { name: "11:00", current: true })).toBeInTheDocument();
  });

  it("agenda com cliente, serviço, data e hora", async () => {
    const falso = semear();
    // `falso.barbeiro` é o mesmo objeto que a tela recebe (montarPainel
    // passa por referência), então uma arrow function que chama de volta
    // `falso.barbeiro.criarAgendamento` faz uma busca de propriedade no
    // momento da chamada — e essa propriedade já é o próprio mock depois
    // da linha de baixo. O resultado é recursão síncrona infinita, que o
    // catch da tela engoliria como "não foi possível agendar agora",
    // com o teste passando em verde sem nunca ter provado uma criação de
    // verdade. Capturar a função original antes de sobrescrever evita a
    // auto-referência.
    const original = falso.barbeiro.criarAgendamento;
    const criar = vi.fn(async (novo: Parameters<typeof original>[0]) => original(novo));
    falso.barbeiro.criarAgendamento = criar;

    montarPainel(<NovoAgendamento agora={AGORA} />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /João Silva/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Corte/ }));
    await userEvent.click(screen.getByRole("button", { name: /^agendar$/i }));

    await waitFor(() => expect(criar).toHaveBeenCalled());
    // Prova que a chamada real aconteceu uma vez só — sem isto, a
    // recursão do parágrafo acima passaria despercebida de novo.
    expect(criar.mock.calls.length).toBe(1);
    expect(criar.mock.calls[0][0]).toMatchObject({
      // barbeiroId é o id do perfil logado: a barbearia do MVP tem um
      // barbeiro só.
      barbeiroId: "bb1",
      clienteId: "c1",
      servicoIds: ["s1"],
      data: "2026-09-09",
      horaInicio: "11:00",
    });
  });

  it("não deixa agendar sem cliente ou sem serviço", async () => {
    montarPainel(<NovoAgendamento agora={AGORA} />, semear());

    expect(await screen.findByRole("button", { name: /^agendar$/i })).toBeDisabled();
  });

  it("cadastra cliente novo sem sair da tela", async () => {
    montarPainel(<NovoAgendamento agora={AGORA} />, semear());

    await userEvent.click(await screen.findByRole("button", { name: /cadastrar novo/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Ana Souza");
    await userEvent.type(screen.getByLabelText(/telefone/i), "11988887777");
    await userEvent.click(screen.getByRole("button", { name: /^cadastrar$/i }));

    expect(await screen.findByRole("button", { name: /Ana Souza/, current: true })).toBeInTheDocument();
  });

  it("telefone já cadastrado oferece o cliente existente em vez de erro", async () => {
    // É o caso comum do walk-in: quem chega já existe, criado pelo
    // upsert do agendamento público.
    const falso = semear();
    falso.barbeiro.criarCliente = async () => {
      throw new ErroDaApi(409, "conflito", "esse telefone já tem cadastro");
    };
    montarPainel(<NovoAgendamento agora={AGORA} />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /cadastrar novo/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "João");
    await userEvent.type(screen.getByLabelText(/telefone/i), "11999990001");
    await userEvent.click(screen.getByRole("button", { name: /^cadastrar$/i }));

    expect(await screen.findByText(/esse telefone já tem cadastro/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /João Silva/ })).toBeInTheDocument();
    // As duas asserções acima também passariam com o branch de conflito
    // inteiro apagado: a mensagem genérica ecoaria o mesmo `mensagem` do
    // erro, e João Silva já aparece na lista inicial (busca vazia traz
    // todo mundo) mesmo sem nenhuma busca nova. Esta é a que realmente
    // depende do `setBusca(numero)` — o campo de busca só mostra esse
    // valor se o handler de conflito o tiver preenchido, e os campos do
    // cadastro já saíram do ar (`cadastrando` volta a false).
    expect(screen.getByDisplayValue("(11) 99999-0001")).toBeInTheDocument();
  });

  it("data no passado avisa e exige confirmar", async () => {
    // Registrar retroativamente é legítimo — garantirAlteravel não toca
    // o escopo do barbeiro. Fazer isso sem perceber, não.
    navegacaoFalsa.redefinir({
      pathname: "/painel/agendamentos/novo",
      query: { data: "2026-09-01", hora: "11:00" },
    });
    montarPainel(<NovoAgendamento agora={AGORA} />, semear());

    await userEvent.click(await screen.findByRole("button", { name: /João Silva/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Corte/ }));

    expect(screen.getByText(/data no passado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^agendar$/i })).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox", { name: /registrar mesmo assim/i }));

    expect(screen.getByRole("button", { name: /^agendar$/i })).toBeEnabled();
  });

  it("horario_ocupado manda recarregar os horários, não repetir o envio", async () => {
    // É a corrida que a trava do banco pega depois de a disponibilidade
    // já ter dito que cabia.
    const falso = semear();
    falso.barbeiro.criarAgendamento = async () => {
      throw new ErroDaApi(409, "horario_ocupado", "esse horário já está ocupado");
    };
    montarPainel(<NovoAgendamento agora={AGORA} />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /João Silva/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Corte/ }));
    await userEvent.click(screen.getByRole("button", { name: /^agendar$/i }));

    expect(await screen.findByText(/esse horário acabou de ser ocupado/i)).toBeInTheDocument();
  });
});
