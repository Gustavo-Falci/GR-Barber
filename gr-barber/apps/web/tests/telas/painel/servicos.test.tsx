import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { CadastroDeServico } from "../../../src/telas/painel/CadastroDeServico";
import { ListaDeServicos } from "../../../src/telas/painel/ListaDeServicos";
import { navegacaoFalsa } from "../../ajudantes/navegacao";
import { montarPainel } from "../../ajudantes/painel";

function semear() {
  return criarApiClientFalso({
    servicos: [
      { id: "s1", nome: "Corte", duracaoMinutos: 30, preco: "40.00", ativo: true },
      { id: "s2", nome: "Barba", duracaoMinutos: 20, preco: "25.00", ativo: false },
    ],
  });
}

describe("serviços no painel", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos" });
  });

  it("lista ativos e inativos, marcando os inativos", async () => {
    // É desta tela que o barbeiro reativa o que desativou; um inativo
    // que sumisse seria irrecuperável pela interface.
    montarPainel(<ListaDeServicos />, semear());

    expect(await screen.findByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("Barba")).toBeInTheDocument();
    expect(screen.getByText(/inativo/i)).toBeInTheDocument();
  });

  it("mostra preço e duração", async () => {
    montarPainel(<ListaDeServicos />, semear());

    expect(await screen.findByText("R$ 40,00")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
  });

  it("cria serviço com preço em string", async () => {
    // String, nunca number: o preço é Decimal no banco e float perderia
    // centavo.
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos/novo" });
    const falso = semear();
    const original = falso.barbeiro.criarServico;
    const criar = vi.fn(
      async (novo: { nome: string; duracaoMinutos: number; preco: string }) =>
        original(novo)
    );
    falso.barbeiro.criarServico = criar;

    montarPainel(<CadastroDeServico />, falso);

    // A guarda de sessão resolve o perfil de forma assíncrona; uma
    // consulta síncrona aqui correria contra ela e veria o body vazio.
    await userEvent.type(await screen.findByLabelText(/nome/i), "Sobrancelha");
    await userEvent.type(screen.getByLabelText(/duração/i), "15");
    await userEvent.type(screen.getByLabelText(/preço/i), "20,00");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(criar).toHaveBeenCalledWith({
        nome: "Sobrancelha",
        duracaoMinutos: 15,
        preco: "20.00",
      })
    );
  });

  it("a edição chega preenchida com o serviço da lista", async () => {
    // Não existe servico(id) no client — a tela acha em servicos().
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos/s1", params: { id: "s1" } });
    montarPainel(<CadastroDeServico />, semear());

    expect(await screen.findByDisplayValue("Corte")).toBeInTheDocument();
  });

  it("desativa e reativa", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos/s1", params: { id: "s1" } });
    const falso = semear();
    const original = falso.barbeiro.desativarServico;
    const desativar = vi.fn(async (id: string) => original(id));
    falso.barbeiro.desativarServico = desativar;

    montarPainel(<CadastroDeServico />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /desativar/i }));

    await waitFor(() => expect(desativar).toHaveBeenCalledWith("s1"));
  });

  it("serviço que não existe vira aviso", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos/s9", params: { id: "s9" } });
    montarPainel(<CadastroDeServico />, semear());

    expect(await screen.findByText(/serviço não encontrado/i)).toBeInTheDocument();
  });

  // Adicional: a asserção acima só prova que "inativo" aparece em algum
  // lugar da página — passaria também se o chip saísse em toda linha.
  // Esta prova o lado que faltava, escopada na própria linha do ativo
  // pra não pegar o chip da linha do "Barba" e validar por acidente.
  it("não marca o serviço ativo como inativo", async () => {
    montarPainel(<ListaDeServicos />, semear());

    const linhaDoAtivo = (await screen.findByText("Corte")).closest("tr");
    if (!linhaDoAtivo) throw new Error("linha do serviço ativo não encontrada");

    expect(within(linhaDoAtivo as HTMLElement).queryByText(/inativo/i)).not.toBeInTheDocument();
  });

  // Adicional: "20,00" não distingue trocar vírgula por ponto de
  // normalizar pra duas casas — os dois caminhos produzem "20.00" pra
  // essa entrada. "20,5" separa os dois: o normalizado vira "20.50", um
  // replace sem o toFixed(2) ficaria em "20.5".
  it("preço com uma casa decimal ainda vira duas ao salvar", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos/novo" });
    const falso = semear();
    const original = falso.barbeiro.criarServico;
    const criar = vi.fn(
      async (novo: { nome: string; duracaoMinutos: number; preco: string }) =>
        original(novo)
    );
    falso.barbeiro.criarServico = criar;

    montarPainel(<CadastroDeServico />, falso);

    await userEvent.type(await screen.findByLabelText(/nome/i), "Luzes");
    await userEvent.type(screen.getByLabelText(/duração/i), "40");
    await userEvent.type(screen.getByLabelText(/preço/i), "20,5");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(criar).toHaveBeenCalledWith({
        nome: "Luzes",
        duracaoMinutos: 40,
        preco: "20.50",
      })
    );
  });

  // Adicional: "desativa e reativa" só cobre a metade que o nome
  // promete — nunca abre um inativo nem clica "Reativar". Pina o
  // método e o corpo, porque atualizarServico com o corpo errado
  // ainda satisfaria uma asserção que só checasse a chamada.
  it("reativa um serviço inativo com o payload certo", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos/s2", params: { id: "s2" } });
    const falso = semear();
    const original = falso.barbeiro.atualizarServico;
    const atualizar = vi.fn(
      async (id: string, edicao: { ativo?: boolean }) => original(id, edicao)
    );
    falso.barbeiro.atualizarServico = atualizar;

    montarPainel(<CadastroDeServico />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /reativar/i }));

    await waitFor(() => expect(atualizar).toHaveBeenCalledWith("s2", { ativo: true }));
  });

  // Adicional: sem checar servicos.erro, uma falha ao buscar a lista
  // deixava dados null pra sempre — o guard de "não encontrado"
  // também depende de dados, então a tela ficava no formulário vazio
  // sem dizer nada.
  it("erro ao buscar serviços vira aviso, não formulário em branco", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos/s1", params: { id: "s1" } });
    const falso = semear();
    falso.barbeiro.servicos = async () => {
      throw new ErroDaApi(500, "erro_interno", "não foi possível carregar os serviços");
    };

    montarPainel(<CadastroDeServico />, falso);

    expect(
      await screen.findByText("não foi possível carregar os serviços")
    ).toBeInTheDocument();
  });

  // Apêndice: CadastroDeServico.tsx sincroniza os campos durante a
  // renderização, mas o rastreador é `atual` (o item achado na lista) e
  // não `servicos.dados` (o array inteiro) — de propósito. O dublê
  // devolve a MESMA referência de array em toda chamada a `servicos()`
  // (`return estado.servicos`, nunca reatribuído; só o item dentro dela
  // é trocado por `{...antigo, ...edicao}`). Se o rastreador fosse
  // `servicos.dados`, a condição `servicos.dados !== anterior` nunca
  // voltaria a ser verdadeira depois de `servicos.recarregar()` — a
  // tela ficaria travada nos valores da primeira leitura pra sempre,
  // mesmo com o servidor tendo mudado o serviço embaixo dela.
  //
  // (Não é uma reprodução da corrida de sincronização em si: as três
  // técnicas usadas para pinar essa corrida em DetalheDoCliente.tsx —
  // temporizador único, MessageChannel na mesma classe de prioridade do
  // agendador do React, e MutationObserver — não encontram uma janela
  // observável aqui. A render que torna `atual` disponível e o efeito
  // de preenchimento sempre terminam no mesmo turno de JavaScript pra
  // esta tela, inclusive forçando um `.find()` sobre um array de 300 mil
  // itens pra tentar empurrar o trabalho síncrono acima do limite de
  // fatia do agendador — ainda colapsado. A explicação mais provável:
  // ao contrário de DetalheDoCliente.tsx, que sai de "Carregando…" pra
  // uma árvore bem maior — três campos mais uma <Tabela> com linha —
  // esta tela e DetalheDoAgendamento.tsx não têm essa trava, ou têm uma
  // árvore de tamanho fixo que não cresce com os dados semeados, o que
  // aparentemente nunca dá ao React motivo pra ceder o controle entre o
  // commit e o efeito. Ver o relatório para o rastro completo.)
  it("desativar com um novo nome no servidor atualiza o campo (o rastreador é o item, não a lista)", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/servicos/s1", params: { id: "s1" } });
    const falso = semear();
    // Original capturado antes da troca — mesma nota de sempre: chamar
    // `falso.barbeiro.atualizarServico` de dentro do mock de
    // `desativarServico` só é seguro porque `original` foi salvo antes
    // da reatribuição.
    const original = falso.barbeiro.atualizarServico;
    // Simula o servidor mudando o nome junto da desativação — poderia
    // ser outro barbeiro editando ao mesmo tempo. O que importa pro
    // teste é só que a resposta de `servicos.recarregar()` traga um
    // nome diferente do que já estava no campo.
    falso.barbeiro.desativarServico = async (id: string) =>
      original(id, { ativo: false, nome: "Corte Premium" });

    montarPainel(<CadastroDeServico />, falso);

    expect(await screen.findByDisplayValue("Corte")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /desativar/i }));

    // `alternarAtivo` chama `servicos.recarregar()` depois de desativar:
    // o array devolvido é a mesma referência de sempre, mas o item
    // achado por `.find()` é outro objeto — é essa troca de referência
    // do item que deve reabrir a sincronização.
    expect(await screen.findByDisplayValue("Corte Premium")).toBeInTheDocument();
  });
});
