import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AgendamentoComCliente, HorarioSerializado } from "@gr-barber/types";
import { GradeDeTempo } from "../../src/componentes/GradeDeTempo";
import { gradeDeTempo } from "../../src/painel/grade";

const HORARIOS: HorarioSerializado[] = [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
  diaSemana,
  horaAbertura: diaSemana === 0 ? null : "09:00",
  horaFechamento: diaSemana === 0 ? null : "18:00",
  fechado: diaSemana === 0,
}));

const TERCA = "2026-09-08";
const AGORA = new Date("2026-09-08T10:00:00-03:00");

function agendamento(): AgendamentoComCliente {
  return {
    id: "a1",
    data: TERCA,
    horaInicio: "11:00",
    horaFim: "12:00",
    status: "confirmado",
    origem: "cliente",
    observacoes: null,
    servicos: [
      { servicoId: "s1", nome: "Corte", precoNoMomento: "40.00", duracaoNoMomento: 60 },
    ],
    cliente: {
      id: "c1",
      nome: "João Silva",
      telefone: "(11) 99999-0001",
      email: null,
      temConta: false,
    },
  };
}

function montar(entrada: {
  dias?: string[];
  agendamentos?: AgendamentoComCliente[];
  aoAbrir?: (id: string) => void;
  aoCriar?: (data: string, hora: string) => void;
  aoAbrirDia?: (data: string) => void;
}) {
  const grade = gradeDeTempo({
    dias: entrada.dias ?? [TERCA],
    horarios: HORARIOS,
    agendamentos: entrada.agendamentos ?? [],
    agora: AGORA,
  });

  render(
    <GradeDeTempo
      grade={grade}
      aoAbrir={entrada.aoAbrir ?? (() => {})}
      aoCriar={entrada.aoCriar ?? (() => {})}
      aoAbrirDia={entrada.aoAbrirDia}
    />
  );

  return grade;
}

describe("GradeDeTempo", () => {
  it("posiciona o evento na linha que o domínio calculou", () => {
    montar({ agendamentos: [agendamento()] });

    const evento = screen.getByRole("button", { name: /João Silva/ });
    // 11:00 com janela abrindo às 09:00 = 120 min = linha 25, span 12.
    // Lê-se da custom property porque é ela que alimenta o grid-row: um
    // teste que olhasse o style computado mediria o jsdom, não o CSS.
    expect(evento.style.getPropertyValue("--linha")).toBe("25");
    expect(evento.style.getPropertyValue("--linhas")).toBe("12");
  });

  it("abre o agendamento ao clicar no evento", async () => {
    const aoAbrir = vi.fn((_id: string) => {});
    montar({ agendamentos: [agendamento()], aoAbrir });

    await userEvent.click(screen.getByRole("button", { name: /João Silva/ }));

    expect(aoAbrir).toHaveBeenCalledWith("a1");
  });

  it("cria informando o dia e a hora da faixa clicada", async () => {
    const aoCriar = vi.fn((_data: string, _hora: string) => {});
    montar({ dias: ["2026-09-09"], aoCriar });

    await userEvent.click(screen.getByRole("button", { name: "09:00" }));

    // O dia vai junto: na semana, a hora sozinha não diria qual coluna.
    expect(aoCriar).toHaveBeenCalledWith("2026-09-09", "09:00");
  });

  it("não oferece criar em faixa que já passou", () => {
    montar({ dias: [TERCA] });

    // 09:00 de hoje já passou às 10:00; 11:00 não.
    expect(screen.queryByRole("button", { name: "09:00" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "11:00" })).toBeInTheDocument();
  });

  it("desenha a régua do agora uma vez, na coluna de hoje", () => {
    montar({ dias: ["2026-09-07", TERCA, "2026-09-09"] });

    const reguas = screen.getAllByTestId("regua-do-agora");
    expect(reguas).toHaveLength(1);
    expect(reguas[0].style.getPropertyValue("--linha")).toBe("13");
  });

  it("anuncia o dia fechado em vez de deixar a coluna em branco", () => {
    montar({ dias: ["2026-09-06"] });

    // Fechado e aberto-sem-nada são estados diferentes; confundi-los faz
    // o barbeiro achar que perdeu o dia.
    expect(screen.getByText("Fechado neste dia.")).toBeInTheDocument();
  });

  it("com aoAbrirDia, cada coluna ganha cabeçalho que abre o dia", async () => {
    const aoAbrirDia = vi.fn((_data: string) => {});
    montar({ dias: ["2026-09-07", TERCA], aoAbrirDia });

    await userEvent.click(screen.getByRole("button", { name: "8 de setembro" }));

    expect(aoAbrirDia).toHaveBeenCalledWith(TERCA);
  });

  it("sem aoAbrirDia, não há cabeçalho de coluna", () => {
    // A vista de dia não passa a prop: um botão para abrir o dia que já
    // está aberto seria ruído. Este teste morre se o cabeçalho passar a
    // ser incondicional.
    montar({ dias: [TERCA] });

    expect(
      screen.queryByRole("button", { name: "8 de setembro" })
    ).not.toBeInTheDocument();
  });
});
