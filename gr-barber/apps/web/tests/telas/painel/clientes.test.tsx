import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { CadastroDeCliente } from "../../../src/telas/painel/CadastroDeCliente";
import { DetalheDoCliente } from "../../../src/telas/painel/DetalheDoCliente";
import { ListaDeClientes } from "../../../src/telas/painel/ListaDeClientes";
import { navegacaoFalsa } from "../../ajudantes/navegacao";
import { montarPainel } from "../../ajudantes/painel";
import { montarPainelComSonda } from "../../ajudantes/sondaDeCorrida";

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
    // O traço de antes servia às duas respostas opostas — "nunca veio" e
    // "sumiu faz mais de três meses". Marcos é o segundo caso, e a
    // célula agora diz só o que a janela de 90 dias sabe.
    expect(screen.getByText("Sem registro nos últimos 90 dias")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("diz quantos está mostrando, e muda a frase quando há busca", async () => {
    // Uma lista curta não se distingue de um filtro que comeu o resto
    // sem alguém dizer o número.
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    expect(await screen.findByText("2 clientes")).toBeInTheDocument();

    navegacaoFalsa.redefinir({
      pathname: "/painel/clientes",
      query: { busca: "marcos" },
    });
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    expect(await screen.findByText("1 encontrado para “marcos”")).toBeInTheDocument();
  });

  it("o botão de criar diz do que é", async () => {
    // "+ Novo" é o rótulo de todas as listas do painel; com a barra
    // lateral recolhida, nada na tela diz novo o quê.
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    expect(
      await screen.findByRole("button", { name: /novo cliente/i })
    ).toBeInTheDocument();
  });

  it("enquanto carrega não anuncia lista vazia", async () => {
    // `clientes.dados ?? []` entregava zero linhas à Tabela antes da
    // resposta chegar, e a Tabela vazia afirma "Nenhum cliente por aqui
    // ainda" — a base inteira sumindo por meio segundo a cada abertura.
    const falso = semear();
    let liberar: () => void = () => {};
    const pendente = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const original = falso.barbeiro.clientes;
    falso.barbeiro.clientes = async (busca?: string) => {
      await pendente;
      return original(busca);
    };

    montarPainel(<ListaDeClientes agora={AGORA} />, falso);

    expect(await screen.findByText(/carregando/i)).toBeInTheDocument();
    expect(screen.queryByText(/nenhum cliente/i)).not.toBeInTheDocument();
    // O campo de busca continua de pé: desmontá-lo levaria o foco junto
    // de quem já estivesse digitando.
    expect(screen.getByLabelText(/buscar/i)).toBeInTheDocument();

    liberar();
    expect(await screen.findByText("João Silva")).toBeInTheDocument();
  });

  // O filtro entra pela URL, e o `replace` do dublê de navegação é só um
  // espião — ele não devolve a query nova pro `useSearchParams`. Por isso
  // a busca já montada vem de `redefinir`, e não de digitar.
  it("busca sem resultado diz o que aconteceu e oferece a saída", async () => {
    // "Nenhum cliente por aqui ainda" para uma busca que não achou
    // ninguém anuncia base vazia a quem só digitou o nome errado.
    navegacaoFalsa.redefinir({
      pathname: "/painel/clientes",
      query: { busca: "zzz" },
    });
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    expect(await screen.findByText(/nenhum cliente para “zzz”/i)).toBeInTheDocument();
    expect(screen.queryByText(/por aqui ainda/i)).not.toBeInTheDocument();

    // E a saída: sem ela, o único jeito de voltar à lista inteira é
    // apagar o campo letra por letra.
    await userEvent.click(screen.getByRole("button", { name: /limpar busca/i }));

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/painel/clientes")
    );
  });

  it("a lista vazia de verdade orienta em vez de só informar", async () => {
    montarPainel(
      <ListaDeClientes agora={AGORA} />,
      criarApiClientFalso({ clientes: [], agendamentos: [] })
    );

    expect(await screen.findByText("Nenhum cliente por aqui ainda.")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /cadastrar primeiro cliente/i })
    );

    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel/clientes/novo");
  });

  it("digitar navega uma vez por pausa, não uma por tecla", async () => {
    // `?busca=` é dependência da requisição, então cada tecla custava uma
    // navegação E uma ida à API: "marcos" eram seis de cada.
    //
    // E continua sendo replace, não push: ?busca= na URL mantém a busca
    // linkável e recarregável — a mesma razão que fez o fluxo do cliente
    // pôr o passo na rota — mas um push empilharia histórico, e voltar
    // viraria desfazer a digitação letra por letra.
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    await userEvent.type(await screen.findByLabelText(/buscar/i), "marcos");

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/painel/clientes?busca=marcos")
    );
    // Uma só, e com o termo inteiro — não seis, uma por letra.
    expect(navegacaoFalsa.replace).toHaveBeenCalledTimes(1);
    expect(navegacaoFalsa.push).not.toHaveBeenCalled();
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

  it("abrir uma linha vai pro detalhe", async () => {
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    // Nome exato: as ações da linha se chamam "Agendar para João Silva"
    // e "Conversar com João Silva no WhatsApp", e um /João Silva/ solto
    // casaria com as três.
    await userEvent.click(await screen.findByRole("button", { name: "João Silva" }));

    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel/clientes/c1");
  });

  it("a ação de agendar leva o cliente junto, sem abrir o detalhe", async () => {
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    await userEvent.click(
      await screen.findByRole("button", { name: /agendar para joão silva/i })
    );

    expect(navegacaoFalsa.push).toHaveBeenCalledWith(
      "/painel/agendamentos/novo?cliente=c1"
    );
    // A linha inteira abre o detalhe; sem `stopPropagation`, clicar na
    // ação faria as duas coisas.
    expect(navegacaoFalsa.push).toHaveBeenCalledTimes(1);
  });

  it("a ação do WhatsApp aponta pro número com código do país", async () => {
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    const zap = await screen.findByRole("link", {
      name: /conversar com joão silva no whatsapp/i,
    });

    // O telefone guardado é nacional: "(11) 99999-0001" precisa do 55 na
    // frente, senão o link abre outro número.
    expect(zap).toHaveAttribute("href", "https://wa.me/5511999990001");
    expect(zap).toHaveAttribute("target", "_blank");

    await userEvent.click(zap);
    expect(navegacaoFalsa.push).not.toHaveBeenCalled();
  });

  it("as faixas separam quem está vindo de quem sumiu", async () => {
    // João veio em 30/08 (dentro dos 30 dias contados de AGORA) e Marcos
    // em 05/01, fora até da janela de 90.
    montarPainel(<ListaDeClientes agora={AGORA} />, semear());

    await screen.findByText("João Silva");

    await userEvent.click(screen.getByRole("button", { name: /vieram em 30 dias/i }));
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.queryByText("Marcos Reis")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /sem registro em 90 dias/i })
    );
    expect(screen.getByText("Marcos Reis")).toBeInTheDocument();
    expect(screen.queryByText("João Silva")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^todos/i }));
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Marcos Reis")).toBeInTheDocument();
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
  // depender de sorte do event loop. A tela tem uma trava
  // `if (!cliente.dados) return <Carregando>` que só olha se os dados
  // chegaram — não se `nome`/`telefone`/`email` já foram sincronizados
  // a partir deles. Entre o commit que sai da trava e o efeito de
  // preenchimento (que só roda depois desse commit, se a tela ainda
  // estiver na versão `useEffect`), digitar corre contra o
  // preenchimento e perde o que a pessoa escreveu.
  //
  // Mecanismo (ver `sondaDeCorrida.tsx` e o relatório para o histórico
  // de tentativas anteriores, todas descartadas): contar macrotarefas
  // de fora funciona aqui, mas não em telas com árvore pós-carregamento
  // pequena (CadastroDeServico, DetalheDoAgendamento) — nelas o commit
  // e o efeito colapsam no mesmo turno de JavaScript sob qualquer
  // técnica de temporizador. A sonda evita depender disso: usa a
  // garantia do próprio React de que, dentro de UM commit, layout
  // effects rodam antes de qualquer effect passivo. Ela é montada como
  // irmã da tela, e seu layout effect (sem array de dependências) roda
  // em toda renderização SUA — o gatilho pra essa renderização vem do
  // mock da API, chamado de forma síncrona no exato ponto em que ele
  // retoma de uma promessa travada. As duas atualizações (a da tela e a
  // da sonda) entram no mesmo lote pendente do React, então costumam
  // commitar juntas — e quando isso acontece, o layout effect da sonda
  // vê o DOM logo depois do commit da tela, antes do efeito passivo
  // dela rodar.
  //
  // `fireEvent.change` não pode ser chamado direto de dentro do layout
  // effect (o próprio React rejeita com "Should not already be
  // working" — ainda estamos dentro do work loop dele). Por isso o
  // layout effect só resolve uma promessa, e o `fireEvent.change` roda
  // no microtask seguinte, ainda antes de qualquer macrotarefa (onde o
  // efeito passivo, se existir, está agendado).
  it("digitar no instante em que o cliente chega não perde a edição (corrida de sincronização)", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/c1", params: { id: "c1" } });
    const falso = criarApiClientFalso({
      clientes: [
        { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
      ],
      agendamentos: [],
    });
    const original = falso.barbeiro.atualizarCliente;
    const atualizar = vi.fn(
      async (id: string, edicao: { nome?: string; telefone?: string }) =>
        original(id, edicao)
    );
    falso.barbeiro.atualizarCliente = atualizar;

    // Trava a leitura do cliente até o teste mandar liberar.
    let liberar: () => void = () => {};
    const pendente = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const clienteOriginal = falso.barbeiro.cliente;
    let disparoDaSonda: () => void = () => {};
    falso.barbeiro.cliente = async (id: string) => {
      await pendente;
      // Síncrono, antes de qualquer outro `await` desta função: é o
      // que faz a atualização da sonda entrar no mesmo lote do React
      // que a atualização (`setDados`) que a tela eventualmente dispara.
      disparoDaSonda();
      return clienteOriginal(id);
    };

    // A sonda roda `aoRenderizar` uma vez no mount (tela ainda
    // carregando — ignorada abaixo) e de novo quando `disparar()` é
    // chamado. Na segunda chamada, resolve `prontinho`: o teste
    // continua no microtask seguinte, ainda antes de qualquer efeito
    // passivo pendente da tela ter rodado.
    let chamadas = 0;
    let resolverProntinho: () => void = () => {};
    const prontinho = new Promise<void>((resolve) => {
      resolverProntinho = resolve;
    });
    const { disparar } = montarPainelComSonda(<DetalheDoCliente />, falso, () => {
      chamadas++;
      if (chamadas < 2) return;
      resolverProntinho();
    });
    disparoDaSonda = disparar;

    await screen.findByText(/carregando/i);
    liberar();

    await prontinho;
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

  it("o histórico do detalhe mostra o status traduzido, não o enum cru", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/c1", params: { id: "c1" } });
    montarPainel(<DetalheDoCliente />, semear());

    // O agendamento de João em `semear()` tem status "concluido".
    expect(await screen.findByText("concluído")).toBeInTheDocument();
    expect(screen.queryByText("concluido")).not.toBeInTheDocument();
  });

  // Mesma nota das outras mensagens vazias neste arquivo: sem `mensagem`
  // vazia, "Não foi possível salvar agora." (o fallback genérico) e a
  // cópia amigável do `conflito` seriam dois textos plausíveis demais
  // pra provar qual ramo produziu qual — aqui a mensagem vazia garante
  // que só o branch `codigo === "conflito"` pode produzir a cópia
  // esperada; sem ele, o teste veria o fallback genérico, não o texto
  // cru da API (que também é "").
  it("editar um cliente com telefone repetido usa a mesma cópia do cadastro, não o fallback genérico", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/clientes/c1", params: { id: "c1" } });
    const falso = semear();
    falso.barbeiro.atualizarCliente = async () => {
      throw new ErroDaApi(409, "conflito", "");
    };
    montarPainel(<DetalheDoCliente />, falso);

    await screen.findByDisplayValue("João Silva");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    expect(
      await screen.findByText("Esse telefone já tem cadastro. Procure por ele na lista.")
    ).toBeInTheDocument();
  });

  // Representa os oito pontos de fallback do item 1 da revisão de
  // branch: um erro sem `mensagem` (o corpo que a API manda pra 401,
  // por exemplo) não pode virar um Aviso vazio.
  it("uma falha ao carregar clientes sem mensagem cai no fallback, não numa caixa vazia", async () => {
    const falso = semear();
    falso.barbeiro.clientes = async () => {
      throw new ErroDaApi(500, "erro_interno", "");
    };
    montarPainel(<ListaDeClientes agora={AGORA} />, falso);

    expect(
      await screen.findByText(/não foi possível carregar os clientes agora/i)
    ).toBeInTheDocument();
  });

  // Mutação testada manualmente: comentar o `if (recentes.erro)` faz
  // este teste falhar mostrando "—" pra João em vez do aviso — a lista
  // continua renderizando normalmente porque só `clientes.erro` travava
  // a tela antes deste fix, e a chamada de intervalo falhando não
  // impedia `clientes.dados` de chegar.
  it("uma falha ao carregar os últimos agendamentos vira aviso, não um '—' confiante em toda linha", async () => {
    const falso = semear();
    falso.barbeiro.agendamentosDoIntervalo = async () => {
      throw new ErroDaApi(500, "erro_interno", "");
    };
    montarPainel(<ListaDeClientes agora={AGORA} />, falso);

    expect(
      await screen.findByText(/não foi possível carregar os últimos agendamentos agora/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("João Silva")).not.toBeInTheDocument();
  });
});
