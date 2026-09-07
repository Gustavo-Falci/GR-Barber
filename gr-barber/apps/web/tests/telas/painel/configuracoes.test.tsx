import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarApiClientFalso } from "@gr-barber/api-client";
import type { HorarioSerializado } from "@gr-barber/types";
import { ConfiguracoesDaBarbearia } from "../../../src/telas/painel/ConfiguracoesDaBarbearia";
import { navegacaoFalsa } from "../../ajudantes/navegacao";
import { montarPainel } from "../../ajudantes/painel";

describe("configurações da barbearia", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({ pathname: "/painel/configuracoes" });
  });

  it("chega preenchida com os dados da barbearia", async () => {
    montarPainel(<ConfiguracoesDaBarbearia />, criarApiClientFalso());

    expect(await screen.findByDisplayValue("GR Barber")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rua das Tesouras, 123")).toBeInTheDocument();
  });

  it("salva os dados da barbearia", async () => {
    const falso = criarApiClientFalso();
    const original = falso.barbeiro.atualizarMinhaBarbearia;
    const salvar = vi.fn(async (edicao: { nome?: string; endereco?: string | null }) =>
      original(edicao)
    );
    falso.barbeiro.atualizarMinhaBarbearia = salvar;

    montarPainel(<ConfiguracoesDaBarbearia />, falso);

    const campo = await screen.findByLabelText(/nome da barbearia/i);
    await userEvent.clear(campo);
    await userEvent.type(campo, "GR Barber Centro");
    await userEvent.click(screen.getByRole("button", { name: /salvar dados/i }));

    await waitFor(() =>
      expect(salvar).toHaveBeenCalledWith(expect.objectContaining({ nome: "GR Barber Centro" }))
    );
  });

  it("manda a semana inteira, inclusive os dias fechados", async () => {
    // Dia ausente do corpo vira fechado na API, de propósito: "sem
    // linha" e "fechado" são estados diferentes pro cálculo de
    // disponibilidade. A tela edita os sete e envia os sete, sempre.
    const falso = criarApiClientFalso();
    const original = falso.barbeiro.salvarHorarios;
    const salvar = vi.fn(async (horarios: HorarioSerializado[]) =>
      original(horarios)
    );
    falso.barbeiro.salvarHorarios = salvar;

    montarPainel(<ConfiguracoesDaBarbearia />, falso);

    await userEvent.click(await screen.findByRole("button", { name: /salvar horários/i }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());
    expect(salvar.mock.calls[0][0]).toHaveLength(7);
  });

  it("fechar um dia limpa abertura e fechamento", async () => {
    const falso = criarApiClientFalso();
    const original = falso.barbeiro.salvarHorarios;
    const salvar = vi.fn(async (horarios: HorarioSerializado[]) =>
      original(horarios)
    );
    falso.barbeiro.salvarHorarios = salvar;

    montarPainel(<ConfiguracoesDaBarbearia />, falso);

    await userEvent.click(await screen.findByRole("checkbox", { name: /fechado na segunda/i }));
    await userEvent.click(screen.getByRole("button", { name: /salvar horários/i }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());
    const segunda = salvar.mock.calls[0][0].find((h) => h.diaSemana === 1);
    expect(segunda).toMatchObject({ fechado: true, horaAbertura: null, horaFechamento: null });
  });

  it("telefone do perfil sem DDD para no campo", async () => {
    montarPainel(<ConfiguracoesDaBarbearia />, criarApiClientFalso());

    await userEvent.type(await screen.findByLabelText(/seu telefone/i), "988887777");
    await userEvent.click(screen.getByRole("button", { name: /salvar perfil/i }));

    expect(await screen.findByText(/informe o DDD/i)).toBeInTheDocument();
  });

  // Apêndice: a tela edita os sete dias e envia os sete, sempre — mas
  // antes de GET /barbearias/me/horarios responder, `semana` é `[]`.
  // Um clique em "Salvar horários" nessa janela mandaria um array
  // vazio, e a API fecha os sete dias quando um dia falta no corpo:
  // um clique comum, num instante comum, fecharia a barbearia inteira
  // em silêncio. Isso é dano de produção, não só a corrida de teste
  // que motivou a trava original — a trava também impede este clique.
  it("não manda horários vazios enquanto a semana ainda está carregando", async () => {
    const falso = criarApiClientFalso();
    const original = falso.barbeiro.salvarHorarios;
    const salvar = vi.fn(async (horarios: HorarioSerializado[]) => original(horarios));
    falso.barbeiro.salvarHorarios = salvar;

    // Trava a leitura da semana até o teste mandar liberar: sem isso
    // não há como observar a tela no instante em que a semana ainda
    // não chegou.
    let liberar: () => void = () => {};
    const pendente = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const horariosOriginais = falso.barbeiro.horarios;
    falso.barbeiro.horarios = async () => {
      await pendente;
      return horariosOriginais();
    };

    montarPainel(<ConfiguracoesDaBarbearia />, falso);

    await screen.findByText(/carregando/i);
    // O botão pode não existir ainda (tela travada) ou existir
    // desabilitado — o que importa é o resultado: nenhum array vazio
    // chega à API. Um clique tentado aqui não pode ter efeito.
    const botao = screen.queryByRole("button", { name: /salvar horários/i });
    if (botao) await userEvent.click(botao);

    expect(salvar).not.toHaveBeenCalled();

    liberar();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /salvar horários/i })).toBeInTheDocument()
    );
  });
});
