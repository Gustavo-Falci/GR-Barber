import { describe, expect, it } from "vitest";
import {
  dataParaDate,
  dateParaData,
  dateParaHora,
  horaParaDate,
  somarMinutos,
} from "../../src/lib/horas";

describe("horaParaDate", () => {
  it("constrói em UTC, independente do fuso da máquina", () => {
    // Esta é a asserção que pega o bug de fuso: toISOString sempre
    // imprime em UTC, então se a data tivesse sido montada em horário
    // local isso daria 12:00 numa máquina em America/Sao_Paulo.
    expect(horaParaDate("09:00").toISOString()).toBe("1970-01-01T09:00:00.000Z");
  });

  it("aceita a meia-noite e o último minuto do dia", () => {
    expect(horaParaDate("00:00").toISOString()).toBe("1970-01-01T00:00:00.000Z");
    expect(horaParaDate("23:59").toISOString()).toBe("1970-01-01T23:59:00.000Z");
  });

  it("rejeita formato inválido", () => {
    expect(() => horaParaDate("9:00")).toThrow(RangeError);
    expect(() => horaParaDate("24:00")).toThrow(RangeError);
    expect(() => horaParaDate("09:60")).toThrow(RangeError);
    expect(() => horaParaDate("nove")).toThrow(RangeError);
  });
});

describe("dateParaHora", () => {
  it("faz o caminho de volta", () => {
    expect(dateParaHora(horaParaDate("14:30"))).toBe("14:30");
  });

  it("preenche com zero à esquerda", () => {
    expect(dateParaHora(horaParaDate("07:05"))).toBe("07:05");
  });
});

describe("dataParaDate", () => {
  it("constrói em UTC", () => {
    expect(dataParaDate("2026-09-01").toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("faz o caminho de volta", () => {
    expect(dateParaData(dataParaDate("2026-12-31"))).toBe("2026-12-31");
  });

  it("rejeita data que não existe no calendário", () => {
    // Date.UTC normalizaria 2026-02-31 pra 2026-03-03 em silêncio.
    expect(() => dataParaDate("2026-02-31")).toThrow(RangeError);
    expect(() => dataParaDate("2026-13-01")).toThrow(RangeError);
    expect(() => dataParaDate("01/09/2026")).toThrow(RangeError);
  });
});

describe("somarMinutos", () => {
  it("soma dentro da mesma hora", () => {
    expect(somarMinutos("10:00", 45)).toBe("10:45");
  });

  it("vira a hora", () => {
    expect(somarMinutos("10:30", 45)).toBe("11:15");
  });

  it("rejeita soma que passa da meia-noite", () => {
    // A coluna `periodo` é tsrange((data + hora_inicio), (data + hora_fim)).
    // Se hora_fim virasse o dia, o range ficaria invertido e o Postgres
    // recusaria a linha com um erro bem menos claro que este.
    expect(() => somarMinutos("23:30", 45)).toThrow(RangeError);
  });
});
