import { describe, expect, it } from "vitest";
import type { AgendamentoComCliente, HorarioSerializado } from "@gr-barber/types";
import { diasDaSemana, faixasDoDia } from "../../src/painel/grade";

const ABERTO: HorarioSerializado = {
  diaSemana: 2,
  horaAbertura: "09:00",
  horaFechamento: "11:00",
  fechado: false,
};

const AGENDAMENTO: AgendamentoComCliente = {
  id: "a1",
  data: "2026-09-08",
  horaInicio: "09:30",
  horaFim: "10:00",
  status: "confirmado",
  origem: "cliente",
  observacoes: null,
  servicos: [
    { servicoId: "s1", nome: "Corte", precoNoMomento: "40.00", duracaoNoMomento: 30 },
  ],
  cliente: {
    id: "c1",
    nome: "João Silva",
    telefone: "(11) 99999-0001",
    email: null,
    temConta: false,
  },
};

describe("faixas do dia", () => {
  it("cobre a janela de funcionamento de meia em meia hora", () => {
    const faixas = faixasDoDia({
      data: "2026-09-08",
      horario: ABERTO,
      agendamentos: [],
      agora: new Date("2026-09-01T10:00:00-03:00"),
    });

    expect(faixas.map((f) => f.hora)).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("dia fechado não tem faixa nenhuma", () => {
    const faixas = faixasDoDia({
      data: "2026-09-06",
      horario: { diaSemana: 0, horaAbertura: null, horaFechamento: null, fechado: true },
      agendamentos: [],
      agora: new Date("2026-09-01T10:00:00-03:00"),
    });

    expect(faixas).toEqual([]);
  });

  it("põe o agendamento na faixa em que ele começa", () => {
    const faixas = faixasDoDia({
      data: "2026-09-08",
      horario: ABERTO,
      agendamentos: [AGENDAMENTO],
      agora: new Date("2026-09-01T10:00:00-03:00"),
    });

    expect(faixas[1].agendamento?.cliente.nome).toBe("João Silva");
    expect(faixas[0].agendamento).toBeNull();
  });

  it("marca como passada a faixa de hoje que já passou", () => {
    // Oferecer 09:00 às 10h é ruído, não recurso. A barreira é da tela
    // porque garantirFuturo não existe na API.
    const faixas = faixasDoDia({
      data: "2026-09-08",
      horario: ABERTO,
      agendamentos: [],
      agora: new Date("2026-09-08T10:00:00-03:00"),
    });

    expect(faixas.find((f) => f.hora === "09:00")?.passada).toBe(true);
    expect(faixas.find((f) => f.hora === "10:30")?.passada).toBe(false);
  });

  it("num dia futuro nenhuma faixa é passada", () => {
    const faixas = faixasDoDia({
      data: "2026-09-09",
      horario: ABERTO,
      agendamentos: [],
      agora: new Date("2026-09-08T23:00:00-03:00"),
    });

    expect(faixas.every((f) => !f.passada)).toBe(true);
  });

  it("a semana vai de domingo a sábado contendo o dia", () => {
    // 2026-09-08 é uma terça; o domingo daquela semana é 2026-09-06.
    expect(diasDaSemana("2026-09-08")[0]).toBe("2026-09-06");
    expect(diasDaSemana("2026-09-08")).toHaveLength(7);
  });
});
