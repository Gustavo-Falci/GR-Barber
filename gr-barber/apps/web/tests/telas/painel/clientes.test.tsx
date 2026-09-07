import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { CadastroDeCliente } from "../../../src/telas/painel/CadastroDeCliente";
import { DetalheDoCliente } from "../../../src/telas/painel/DetalheDoCliente";
import { ListaDeClientes } from "../../../src/telas/painel/ListaDeClientes";
import { navegacaoFalsa } from "../../ajudantes/navegacao";
import { montarPainel } from "../../ajudantes/painel";

// Instante fixo: a lista busca os agendamentos dos últimos 90 dias, e
// sem passar o instante a janela mudaria a cada dia que o teste rodasse.
const AGORA = new Date("2026-09-08T10:00:00-03:00");

function semear() {
  return criarApiClientFalso({
    clientes: [
      { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
      { id: "c2", nome: "Marcos Reis", telefone: "(11) 99999-0002", email: null, temConta: false },
    ],
    agendamentos: [
      {
        id: "a1",
        clienteId: "c1",
        data: "2026-08-30",
        horaInicio: "09:00",
        horaFim: "09:30",
        status: "concluido",
        origem: "cliente",
        observacoes: null,
        servicos: [
          { servicoId: "s1", nome: "Corte", precoNoMomento: "40.00", duracaoNoMomento: 30 },
        ],
      },
      // Fora da janela de 90 dias a partir de AGORA (2026-09-08): o
      // corte fica perto de 2026-06-10, e esta data é bem anterior a
      // isso, sem risco de fuso horário empurrá-la pra dentro. Sem esta
      // entrada, nada no arquivo distingue uma janela de 90 dias de uma
      // busca sem limite nenhum.
      {
        id: "a2",
        clienteId: "c2",
        data: "2026-01-05",
        horaInicio: "10:00",
        horaFim: "10:30",
        status: "concluido",
        origem: "cliente",
        observacoes: null,
        servicos: [
          { servicoId: "s1", nome: "Corte", precoNoMomento: "40.00", duracaoNoMomento: 30 },
        ],
      },
    ],
  });
}

describe("clientes no painel", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes" });
  });

  it("lista os clientes com nome e telefone", async () => {
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    expect(await screen.findByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Marcos Reis")).toBeInTheDocument();
    // O último agendamento de João (30/08) cai dentro da janela de 90
    // dias a partir de AGORA; o de Marcos (05/01) fica de fora e mostra
    // "—". Sem isso, apagar a janela e buscar tudo passaria igual.
    expect(await screen.findByText("30 de agosto")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("a busca da URL chega na chamada", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes", query: { busca: "marcos" } });
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    expect(await screen.findByText("Marcos Reis")).toBeInTheDocument();
    expect(screen.queryByText("João Silva")).not.toBeInTheDocument();
    // Pin do estado local do campo: sem semeá-lo a partir da URL, o
    // campo abriria vazio mesmo com a lista já filtrada por "marcos".
    expect(await screen.findByLabelText(/buscar/i)).toHaveValue("marcos");
  });

  it("digitar na busca põe o termo na URL", async () => {
    // ?busca= na URL: recarregar não perde o filtro, e o resultado é
    // linkável — a mesma razão que fez o fluxo do cliente pôr o passo
    // na rota.
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    await userEvent.type(await screen.findByLabelText(/buscar/i), "marcos");

    await waitFor(() =>
      expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel/clientes?busca=marcos")
    );
  });

  it("abrir uma linha vai pro detalhe", async () => {
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    await userEvent.click(await screen.findByRole("button", { name: /João Silva/ }));

    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel/clientes/c1");
  });

  it("cadastra cliente e vai pro detalhe dele", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/novo" });
    montarPainel(<CadastroDeCliente />, criarApiClientFalso({ clientes: [] }));

    // findBy, e não getBy: SessaoDoPainel só renderiza os filhos depois
    // que `meuPerfil()` resolve, e sem esperar isso aqui o formulário
    // ainda não existe no DOM.
    await userEvent.type(await screen.findByLabelText(/nome/i), "Ana Souza");
    await userEvent.type(screen.getByLabelText(/telefone/i), "11988887777");
    await userEvent.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() =>
      expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel/clientes/c1")
    );
  });

  it("telefone sem DDD para no campo, sem ir à API", async () => {
    // A API responde 400 do pattern; barrar aqui mantém o erro no campo.
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/novo" });
    const falso = criarApiClientFalso({ clientes: [] });
    let chamou = false;
    falso.barbeiro.criarCliente = async () => {
      chamou = true;
      throw new ErroDaApi(400, "requisicao_invalida", "");
    };
    montarPainel(<CadastroDeCliente />, falso);

    // findBy pelo mesmo motivo da asserção acima: a guarda ainda não
    // resolveu no tick em que este teste começa.
    await userEvent.type(await screen.findByLabelText(/nome/i), "Ana Souza");
    await userEvent.type(screen.getByLabelText(/telefone/i), "988887777");
    await userEvent.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(await screen.findByText(/informe o DDD/i)).toBeInTheDocument();
    expect(chamou).toBe(false);
  });

  it("o detalhe mostra os dados e o histórico", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/c1", params: { id: "c1" } });
    montarPainel(<DetalheDoCliente />, semear());

    expect(await screen.findByDisplayValue("João Silva")).toBeInTheDocument();
    expect(screen.getByText(/30 de agosto/i)).toBeInTheDocument();
  });

  it("o detalhe salva a edição", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/c1", params: { id: "c1" } });
    const falso = semear();
    // Original capturado antes da troca — ver a nota do mesmo padrao na
    // Tarefa 9: sem isso o mock chama a si mesmo.
    const original = falso.barbeiro.atualizarCliente;
    const atualizar = vi.fn(
      async (id: string, edicao: { nome?: string; telefone?: string }) =>
        original(id, edicao)
    );
    falso.barbeiro.atualizarCliente = atualizar;

    montarPainel(<DetalheDoCliente />, falso);

    const campo = await screen.findByLabelText(/nome/i);
    await userEvent.clear(campo);
    await userEvent.type(campo, "João da Silva");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(atualizar).toHaveBeenCalledWith("c1", expect.objectContaining({ nome: "João da Silva" }))
    );
  });
});
