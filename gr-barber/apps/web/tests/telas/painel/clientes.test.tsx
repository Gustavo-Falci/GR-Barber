import { fireEvent, screen, waitFor } from "@testing-library/react";
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

  it("telefone repetido aponta pra lista, não deixa a tela sem saída", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/novo" });
    const falso = criarApiClientFalso({ clientes: [] });
    // `mensagem` vazia de propósito: o dublê por padrão já lança "esse
    // telefone já tem cadastro", e se a asserção casasse com isso ela
    // passaria mesmo sem o branch de `conflito` na tela — a mensagem
    // teria vindo do erro genérico (`erro.mensagem || "..."`), não do
    // texto que a tela escolhe pra esse código.
    falso.barbeiro.criarCliente = async () => {
      throw new ErroDaApi(409, "conflito", "");
    };
    montarPainel(<CadastroDeCliente />, falso);

    await userEvent.type(await screen.findByLabelText(/nome/i), "Ana Souza");
    await userEvent.type(screen.getByLabelText(/telefone/i), "11988887777");
    await userEvent.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(
      await screen.findByText("Esse telefone já tem cadastro. Procure por ele na lista.")
    ).toBeInTheDocument();
  });

  it("cliente inexistente vira aviso, não tela em branco", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/x9", params: { id: "x9" } });
    const falso = semear();
    // Mesma nota do teste de telefone repetido: o dublê por padrão já
    // lança "cliente não encontrado" pra qualquer id que não existe, e
    // a mensagem vazia aqui garante que só o branch `nao_encontrado` da
    // tela pode produzir o texto que a asserção procura.
    falso.barbeiro.cliente = async () => {
      throw new ErroDaApi(404, "nao_encontrado", "");
    };
    montarPainel(<DetalheDoCliente />, falso);

    expect(await screen.findByText("Cliente não encontrado.")).toBeInTheDocument();
  });

  // Apêndice: prova a corrida descrita em DetalheDoCliente.tsx sem
  // depender de sorte de agendamento do event loop. A tela tem uma
  // trava `if (!cliente.dados) return <Carregando>` que só olha se os
  // dados chegaram — não se `nome`/`telefone`/`email` já foram
  // sincronizados a partir deles. Entre o commit que sai da trava e o
  // efeito de preenchimento (que só roda depois desse commit), digitar
  // corre contra o preenchimento e perde o que a pessoa escreveu.
  //
  // `findByLabelText`/`waitFor` resolvem assim que o elemento existe no
  // DOM (via MutationObserver, uma microtarefa) — em geral rápido
  // demais pra essa janela, e por isso o bug só aparecia sob a
  // contenção real de CPU de `pnpm test` na raiz. Este teste força a
  // interleaving na mão: trava a resposta de `cliente(id)`, e depois de
  // liberar, distingue as duas fases só com temporizadores.
  //
  // A distinção empírica (ver relatório): resolver a promessa da API
  // só avança o estado do React numa macrotarefa real — 20 voltas de
  // `await Promise.resolve()` (só microtarefas) não bastam para sair da
  // trava de carregamento. Uma volta de `setTimeout(..., 0)` depois
  // disso é suficiente pra sair da trava (o `<h1>` já lê
  // `cliente.dados.nome` direto, sem depender do estado local) mas
  // insuficiente pra rodar o `useEffect` de preenchimento (agendado
  // como passive effect, numa macrotarefa separada) — é exatamente
  // essa segunda macrotarefa que ainda não rodou nesse ponto. As duas
  // fases só ficam separáveis porque esta tela também renderiza a
  // <Tabela> do histórico (uma linha): comprovado experimentalmente que
  // com zero agendamentos as duas macrotarefas colapsam na mesma volta
  // e a janela desaparece — por isso o agendamento de "a1" abaixo não é
  // um detalhe do fixture, é o que abre a janela.
  it("digitar no instante em que o cliente chega não perde a edição (corrida de sincronização)", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/c1", params: { id: "c1" } });
    const falso = criarApiClientFalso({
      clientes: [
        { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
      ],
      // Este agendamento é o que dá à <Tabela> do histórico uma linha
      // pra montar — sem ele o commit que sai de "Carregando…" é pequeno
      // demais e o React nunca cede o controle entre esse commit e o
      // efeito de preenchimento, fechando a janela que este teste existe
      // pra provar. Não é decoração do fixture.
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
      ],
    });
    const original = falso.barbeiro.atualizarCliente;
    const atualizar = vi.fn(
      async (id: string, edicao: { nome?: string; telefone?: string }) =>
        original(id, edicao)
    );
    falso.barbeiro.atualizarCliente = atualizar;

    // Trava a leitura do cliente até o teste mandar liberar: só assim
    // dá pra parar exatamente no instante em que os dados chegaram mas
    // o efeito de preenchimento ainda não rodou.
    let liberar: () => void = () => {};
    const pendente = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const clienteOriginal = falso.barbeiro.cliente;
    falso.barbeiro.cliente = async (id: string) => {
      await pendente;
      return clienteOriginal(id);
    };

    montarPainel(<DetalheDoCliente />, falso);
    await screen.findByText(/carregando/i);

    liberar();
    // Só microtarefas: nenhum `await` aqui cede pro loop de
    // macrotarefas onde a resposta da API e o commit que sai da trava
    // de carregamento acontecem. Confirma que ainda não saiu da trava.
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();

    // Uma única macrotarefa: o bastante pro commit que sai da trava,
    // insuficiente pro efeito de preenchimento (agendado numa
    // macrotarefa separada) — é este o instante que a produção também
    // atravessa, só que sem controle sobre quanto tempo dura. Com a
    // versão de `useEffect` (o bug), `campo.value` ainda é "" aqui: o
    // preenchimento não rodou. Com o fix (sincronizado durante a
    // renderização), o preenchimento já aconteceu no mesmo commit que
    // saiu da trava, então `campo.value` já é "João Silva" — a corrida
    // não tem mais onde acontecer, e é exatamente isso que este teste
    // prova. A asserção que realmente distingue os dois casos é a de
    // `atualizar` no fim: com o bug, o `fireEvent.change` abaixo dispara
    // o `act()` que estava represando o efeito pendente, e o efeito
    // sobrescreve "João da Silva" de volta para "João Silva" antes do
    // clique em Salvar.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const campo = screen.getByLabelText(/^nome$/i) as HTMLInputElement;

    fireEvent.change(campo, { target: { value: "João da Silva" } });
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(atualizar).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ nome: "João da Silva" })
      )
    );
  });
});
