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
    // Capturado antes de sobrescrever, pelo mesmo motivo do
    // `criarAgendamento` original lá em cima: um wrapper que chamasse de
    // volta `falso.publico.disponibilidadeDoDia` recursaria.
    const original = falso.publico.disponibilidadeDoDia;
    const disponibilidade = vi.fn(
      (slug: string, filtro: Parameters<typeof original>[1]) => original(slug, filtro)
    );
    falso.publico.disponibilidadeDoDia = disponibilidade;

    montarPainel(<NovoAgendamento agora={AGORA} />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /João Silva/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Corte/ }));
    await waitFor(() => expect(disponibilidade).toHaveBeenCalled());
    const chamadasAntesDoEnvio = disponibilidade.mock.calls.length;

    await userEvent.click(screen.getByRole("button", { name: /^agendar$/i }));

    expect(await screen.findByText(/esse horário acabou de ser ocupado/i)).toBeInTheDocument();
    // "Recarregar os horários, não repetir o envio" tem duas metades, e
    // a mensagem acima só prova a segunda (que a tela não ficou muda).
    // Sem o `horarios.recarregar()`, a mensagem apareceria do mesmo
    // jeito e esta asserção que falharia — é ela que prova que a lista
    // foi buscada de novo.
    await waitFor(() =>
      expect(disponibilidade.mock.calls.length).toBeGreaterThan(chamadasAntesDoEnvio)
    );
  });

  it("um segundo serviço que deixa de caber no horário escolhido tira a marca e desliga o agendar", async () => {
    // O cenário que o merge de `hora` na lista exibida (do teste de
    // "chega preenchido") não podia mais cobrir sem mentir: depois que
    // existe uma resposta de verdade da disponibilidade para a
    // combinação atual de serviços, essa resposta é a única fonte —
    // reintroduzir a hora antiga marcaria como atual, e deixaria
    // agendar, um horário que a própria API acabou de excluir.
    const falso = semear();
    falso.publico.disponibilidadeDoDia = vi.fn(
      async (_slug: string, filtro: { servicoIds: string[] }) =>
        filtro.servicoIds.length > 1 ? ["12:00"] : ["11:00", "11:30", "12:00"]
    );
    montarPainel(<NovoAgendamento agora={AGORA} />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /João Silva/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Corte/ }));

    expect(await screen.findByRole("button", { name: "11:00", current: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^agendar$/i })).toBeEnabled();

    await userEvent.click(screen.getByRole("checkbox", { name: /Barba/ }));

    // A duração somada de Corte + Barba não cabe mais às 11:00 na
    // disponibilidade combinada acima: o botão daquele horário some da
    // lista (não fica só "sem marca") porque a lista exibida agora é
    // exatamente o que a API respondeu, sem síntese nenhuma.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "11:00" })).not.toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /^agendar$/i })).toBeDisabled();
  });

  it("trocar de data limpa o horário escolhido, que era de outro dia", async () => {
    // Diferente do caso de somar um serviço, aqui não há resposta de
    // rede a esperar: um horário é sempre de um dia específico, e
    // trocar o dia sem limpar a hora deixaria a URL com um par que
    // nunca foi oferecido junto.
    const falso = semear();
    falso.estado.diasComVaga = { "2026-09-10": true };
    montarPainel(<NovoAgendamento agora={AGORA} />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /João Silva/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Corte/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: "10" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "10" }));

    const ultimaChamada = navegacaoFalsa.push.mock.calls.at(-1);
    expect(ultimaChamada?.[0]).toContain("data=2026-09-10");
    expect(ultimaChamada?.[0]).not.toContain("hora=");
  });

  // O quarto caminho de salvamento do painel (ao lado dos três save
  // buttons de Configurações, guardados em 8d044fa): o "Cadastrar"
  // embutido de BuscaDeCliente não tinha `salvando` nem `carregando`, e
  // um duplo clique disparava `criarCliente` duas vezes — a segunda
  // voltaria 409 e a tela culparia o barbeiro por um duplicado que ela
  // mesma acabou de criar. A asserção é sobre quantas vezes o método da
  // API foi chamado, não sobre o atributo `disabled`, mesma razão de
  // 8d044fa: o atributo prova o atributo, não o comportamento que ele
  // existe pra garantir.
  it("um segundo clique em Cadastrar (cliente embutido) não dispara outra chamada enquanto a primeira está em voo", async () => {
    const falso = semear();
    // Original capturado antes da troca — mesma nota de recursão das
    // outras chamadas deste arquivo.
    const original = falso.barbeiro.criarCliente;

    let liberar: () => void = () => {};
    const pendente = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const criar = vi.fn(async (novo: Parameters<typeof original>[0]) => {
      await pendente;
      return original(novo);
    });
    falso.barbeiro.criarCliente = criar;

    montarPainel(<NovoAgendamento agora={AGORA} />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /cadastrar novo/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), "Ana Souza");
    await userEvent.type(screen.getByLabelText(/telefone/i), "11988887777");

    const botao = screen.getByRole("button", { name: /^cadastrar$/i });
    await userEvent.click(botao);
    // Segundo clique enquanto a primeira chamada ainda não resolveu.
    await userEvent.click(botao);

    liberar();
    await waitFor(() => expect(criar).toHaveBeenCalled());
    expect(criar).toHaveBeenCalledTimes(1);
  });
});
