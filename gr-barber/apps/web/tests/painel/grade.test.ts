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
  it("cobre a janela de funcionamento de quinze em quinze minutos", () => {
    // 15, não 30: é a granularidade de packages/scheduling (intervaloMinutos
    // padrão), a mesma que a API valida na criação. Ver o comentário em
    // faixasDoDia.
    const faixas = faixasDoDia({
      data: "2026-09-08",
      horario: ABERTO,
      agendamentos: [],
      agora: new Date("2026-09-01T10:00:00-03:00"),
    });

    expect(faixas.map((f) => f.hora)).toEqual([
      "09:00",
      "09:15",
      "09:30",
      "09:45",
      "10:00",
      "10:15",
      "10:30",
      "10:45",
    ]);
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

    // AGENDAMENTO começa às 09:30, que é a terceira faixa de 15 em 15
    // minutos (09:00, 09:15, 09:30).
    expect(faixas[2].agendamento?.cliente.nome).toBe("João Silva");
    expect(faixas[0].agendamento).toBeNull();
  });

  it("agendamento marcado num quarto de hora aparece na grade", () => {
    // A regressão que este teste existe pra travar: se o passo voltar a
    // 30, um agendamento marcado às 09:15 pelo link do cliente (a API
    // oferece e aceita esse horário — packages/scheduling) some da
    // agenda porque a faixa "09:15" nem chega a existir.
    const agendamentoDeQuinze: AgendamentoComCliente = {
      ...AGENDAMENTO,
      id: "a2",
      horaInicio: "09:15",
      horaFim: "09:45",
    };

    const faixas = faixasDoDia({
      data: "2026-09-08",
      horario: ABERTO,
      agendamentos: [agendamentoDeQuinze],
      agora: new Date("2026-09-01T10:00:00-03:00"),
    });

    expect(faixas.find((f) => f.hora === "09:15")?.agendamento?.cliente.nome).toBe(
      "João Silva"
    );
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

  it("fechado vence mesmo com horário preenchido", () => {
    // A API nunca manda isto: horarios.ts zera as horas sempre que
    // `fechado` vem true, então esta combinação não chega do servidor.
    // O teste existe porque o tipo permite — `fechado` e as horas são
    // campos independentes em HorarioSerializado — e a função não pode
    // depender da disciplina de quem a chama.
    const faixas = faixasDoDia({
      data: "2026-09-08",
      horario: { diaSemana: 2, horaAbertura: "09:00", horaFechamento: "18:00", fechado: true },
      agendamentos: [],
      agora: new Date("2026-09-01T10:00:00-03:00"),
    });

    expect(faixas).toEqual([]);
  });

  it("a semana vai de domingo a sábado contendo o dia", () => {
    // 2026-09-08 é uma terça; o domingo daquela semana é 2026-09-06.
    expect(diasDaSemana("2026-09-08")[0]).toBe("2026-09-06");
    expect(diasDaSemana("2026-09-08")).toHaveLength(7);
  });
});
