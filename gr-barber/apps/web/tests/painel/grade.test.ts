import { describe, expect, it } from "vitest";
import type { AgendamentoComCliente, HorarioSerializado } from "@gr-barber/types";
import { diasDaSemana, gradeDeTempo, MINUTOS_POR_LINHA } from "../../src/painel/grade";

const CLIENTE = {
  id: "c1",
  nome: "João Silva",
  telefone: "(11) 99999-0001",
  email: null,
  temConta: false,
};

// Segunda a sábado das 09 às 18; domingo fechado — o mesmo desenho do
// `criarApiClientFalso`, para que domínio e dublê não discordem.
const HORARIOS: HorarioSerializado[] = [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
  diaSemana,
  horaAbertura: diaSemana === 0 ? null : "09:00",
  horaFechamento: diaSemana === 0 ? null : "18:00",
  fechado: diaSemana === 0,
}));

function agendamento(entrada: {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
}): AgendamentoComCliente {
  return {
    id: entrada.id,
    data: entrada.data,
    horaInicio: entrada.horaInicio,
    horaFim: entrada.horaFim,
    status: "confirmado",
    origem: "cliente",
    observacoes: null,
    servicos: [
      { servicoId: "s1", nome: "Corte", precoNoMomento: "40.00", duracaoNoMomento: 30 },
    ],
    cliente: CLIENTE,
  };
}

// 2026-09-08 é uma terça-feira.
const TERCA = "2026-09-08";
const AGORA = new Date("2026-09-08T10:00:00-03:00");

describe("gradeDeTempo", () => {
  it("posiciona o evento pela hora de início e o dimensiona pela duração", () => {
    const grade = gradeDeTempo({
      dias: [TERCA],
      horarios: HORARIOS,
      agendamentos: [
        agendamento({ id: "a1", data: TERCA, horaInicio: "10:00", horaFim: "11:00" }),
      ],
      agora: AGORA,
    });

    expect(MINUTOS_POR_LINHA).toBe(5);
    // Janela abre às 09:00; 10:00 é 60 minutos depois = 12 linhas, e a
    // linha é 1-based porque entra direto em grid-row.
    const evento = grade.colunas[0].eventos[0];
    expect(evento.linha).toBe(13);
    expect(evento.linhas).toBe(12);
    expect(evento.agendamento.id).toBe("a1");
  });

  it("não oferece faixa livre dentro do intervalo que o agendamento ocupa", () => {
    // ESTE é o bug que motivou o trabalho: a grade antiga casava o
    // agendamento só por horaInicio, então 10:15, 10:30 e 10:45 saíam
    // como "livre" em cima da cadeira ocupada.
    const grade = gradeDeTempo({
      dias: [TERCA],
      horarios: HORARIOS,
      agendamentos: [
        agendamento({ id: "a1", data: TERCA, horaInicio: "10:00", horaFim: "11:00" }),
      ],
      agora: AGORA,
    });

    const horasLivres = grade.colunas[0].livres.map((faixa) => faixa.hora);

    expect(horasLivres).not.toContain("10:00");
    expect(horasLivres).not.toContain("10:15");
    expect(horasLivres).not.toContain("10:30");
    expect(horasLivres).not.toContain("10:45");
    // E a faixa imediatamente seguinte volta a ser oferecida, senão o
    // teste passaria com uma implementação que apaga tudo.
    expect(horasLivres).toContain("11:00");
  });

  it("oferece as faixas livres de quinze em quinze minutos", () => {
    // Herdado do teste de `faixasDoDia`. 15, não 30: é a granularidade
    // de packages/scheduling (intervaloMinutos padrão), a mesma que a
    // API valida na criação. Com passo 30, um agendamento às 09:15 não
    // casa com faixa nenhuma.
    const grade = gradeDeTempo({
      dias: [TERCA],
      horarios: HORARIOS,
      agendamentos: [],
      agora: new Date("2026-09-01T10:00:00-03:00"),
    });

    expect(grade.colunas[0].livres.slice(0, 5).map((f) => f.hora)).toEqual([
      "09:00",
      "09:15",
      "09:30",
      "09:45",
      "10:00",
    ]);
  });

  it("agendamento marcado num quarto de hora aparece na grade", () => {
    // Herdado do teste de `faixasDoDia`, e a regressão mais cara de
    // todas: a API oferece e aceita 09:15 (packages/scheduling). Se a
    // granularidade da grade voltar a 30, esse agendamento some da
    // agenda sem aviso nenhum.
    const grade = gradeDeTempo({
      dias: [TERCA],
      horarios: HORARIOS,
      agendamentos: [
        agendamento({ id: "a2", data: TERCA, horaInicio: "09:15", horaFim: "09:45" }),
      ],
      agora: new Date("2026-09-01T10:00:00-03:00"),
    });

    const evento = grade.colunas[0].eventos[0];
    expect(evento.agendamento.cliente.nome).toBe("João Silva");
    // 09:15 é 15 minutos depois da abertura = 3 linhas de 5.
    expect(evento.linha).toBe(4);
    expect(evento.linhas).toBe(6);
  });

  it("estica a janela para conter agendamento fora do horário de funcionamento", () => {
    // PATCH /horarios não valida contra agendamentos existentes: mudar o
    // funcionamento depois de alguém marcar deixaria o agendamento fora
    // da janela. Sem esticar, ele fica invisível na agenda.
    const grade = gradeDeTempo({
      dias: [TERCA],
      horarios: HORARIOS,
      agendamentos: [
        agendamento({ id: "a1", data: TERCA, horaInicio: "07:30", horaFim: "08:00" }),
      ],
      agora: AGORA,
    });

    expect(grade.minutoInicial).toBe(7 * 60 + 30);
    expect(grade.colunas[0].eventos[0].linha).toBe(1);
  });

  it("marca o dia fechado e não gera faixa livre nele", () => {
    const domingo = "2026-09-06";

    const grade = gradeDeTempo({
      dias: [domingo, "2026-09-07"],
      horarios: HORARIOS,
      agendamentos: [],
      agora: AGORA,
    });

    expect(grade.colunas[0].fechado).toBe(true);
    expect(grade.colunas[0].livres).toHaveLength(0);
    // A segunda-feira ao lado continua aberta — sem isto, uma
    // implementação que marca tudo como fechado passaria.
    expect(grade.colunas[1].fechado).toBe(false);
    expect(grade.colunas[1].livres.length).toBeGreaterThan(0);
  });

  it("fechado vence mesmo com horário preenchido", () => {
    // Herdado do teste de `faixasDoDia`. A API nunca manda isto:
    // horarios.ts zera as horas sempre que `fechado` vem true. O teste
    // existe porque o tipo permite — `fechado` e as horas são campos
    // independentes em HorarioSerializado — e a função não pode depender
    // da disciplina de quem a chama.
    const contraditorio: HorarioSerializado[] = [
      { diaSemana: 2, horaAbertura: "09:00", horaFechamento: "18:00", fechado: true },
    ];

    const grade = gradeDeTempo({
      dias: [TERCA],
      horarios: contraditorio,
      agendamentos: [],
      agora: AGORA,
    });

    expect(grade.colunas[0].fechado).toBe(true);
    expect(grade.colunas[0].livres).toHaveLength(0);
  });

  it("ignora agendamento de dia que não está na grade", () => {
    const grade = gradeDeTempo({
      dias: [TERCA],
      horarios: HORARIOS,
      agendamentos: [
        agendamento({ id: "a1", data: TERCA, horaInicio: "10:00", horaFim: "11:00" }),
        agendamento({ id: "a2", data: "2026-09-09", horaInicio: "10:00", horaFim: "11:00" }),
      ],
      agora: AGORA,
    });

    expect(grade.colunas).toHaveLength(1);
    expect(grade.colunas[0].eventos.map((e) => e.agendamento.id)).toEqual(["a1"]);
  });

  it("descarta agendamento cancelado", () => {
    const cancelado = {
      ...agendamento({ id: "a1", data: TERCA, horaInicio: "10:00", horaFim: "11:00" }),
      status: "cancelado",
    };

    const grade = gradeDeTempo({
      dias: [TERCA],
      horarios: HORARIOS,
      agendamentos: [cancelado],
      agora: AGORA,
    });

    expect(grade.colunas[0].eventos).toHaveLength(0);
    // E a faixa volta a ser oferecida: cancelar libera a cadeira.
    expect(grade.colunas[0].livres.map((f) => f.hora)).toContain("10:00");
  });

  it("põe a linha do agora no dia de hoje, e em nenhum outro", () => {
    const grade = gradeDeTempo({
      dias: ["2026-09-07", TERCA, "2026-09-09"],
      horarios: HORARIOS,
      agendamentos: [],
      agora: AGORA,
    });

    // 10:00 com janela abrindo às 09:00 = 60 min = linha 13.
    expect(grade.agora).toEqual({ data: TERCA, linha: 13 });
  });

  it("não põe linha do agora quando hoje está fora dos dias mostrados", () => {
    const grade = gradeDeTempo({
      dias: ["2026-10-06"],
      horarios: HORARIOS,
      agendamentos: [],
      agora: AGORA,
    });

    expect(grade.agora).toBeNull();
  });

  it("marca como passada só a faixa de hoje que já passou", () => {
    const grade = gradeDeTempo({
      dias: [TERCA, "2026-09-09"],
      horarios: HORARIOS,
      agendamentos: [],
      agora: AGORA,
    });

    const hoje = grade.colunas[0];
    expect(hoje.livres.find((f) => f.hora === "09:00")?.passada).toBe(true);
    expect(hoje.livres.find((f) => f.hora === "11:00")?.passada).toBe(false);
    // Amanhã às 09:00 não passou, por mais tarde que seja agora.
    const amanha = grade.colunas[1];
    expect(amanha.livres.find((f) => f.hora === "09:00")?.passada).toBe(false);
  });
});

describe("diasDaSemana", () => {
  it("a semana vai de domingo a sábado contendo o dia", () => {
    // 2026-09-08 é uma terça; o domingo daquela semana é 2026-09-06.
    expect(diasDaSemana("2026-09-08")[0]).toBe("2026-09-06");
    expect(diasDaSemana("2026-09-08")).toHaveLength(7);
  });
});
