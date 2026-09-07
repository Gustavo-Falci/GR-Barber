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
});
