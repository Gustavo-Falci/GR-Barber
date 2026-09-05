import { describe, expect, it } from "vitest";
import { caminhoDoPasso, lerEscolhas, montarQuery } from "../../src/fluxo/passos";

describe("escolhas na query", () => {
  it("lê a lista de serviços separada por vírgula", () => {
    const escolhas = lerEscolhas(
      new URLSearchParams({ servicos: "s1,s2", data: "2026-09-09" })
    );
    expect(escolhas.servicoIds).toEqual(["s1", "s2"]);
    expect(escolhas.data).toBe("2026-09-09");
    expect(escolhas.hora).toBeUndefined();
  });

  it("devolve lista vazia quando não há serviço nenhum", () => {
    expect(lerEscolhas(new URLSearchParams()).servicoIds).toEqual([]);
  });

  it("ignora vírgula solta em vez de produzir id vazio", () => {
    // Um id vazio viraria ?servicoIds= na chamada e a API responderia
    // 400 por causa do pattern de uuid.
    expect(lerEscolhas(new URLSearchParams({ servicos: "s1,," })).servicoIds).toEqual(
      ["s1"]
    );
  });

  it("monta a query de volta na mesma ordem", () => {
    expect(
      montarQuery({ servicoIds: ["s1", "s2"], data: "2026-09-09", hora: "09:30" })
    ).toBe("?servicos=s1%2Cs2&data=2026-09-09&hora=09%3A30");
  });

  it("carrega o remarcar quando ele existe", () => {
    const escolhas = lerEscolhas(new URLSearchParams({ remarcar: "a1" }));
    expect(escolhas.remarcar).toBe("a1");
    expect(montarQuery(escolhas)).toBe("?remarcar=a1");
  });

  it("o aviso sobrevive à ida e volta entre lerEscolhas e montarQuery", () => {
    // O aviso é como a confirmação avisa a tela de horário sem estado
    // local: precisa ir e voltar intacto, e por último na query pra não
    // deslocar os campos que os outros testes já fixam.
    const escolhas = lerEscolhas(
      new URLSearchParams({ servicos: "s1", data: "2026-09-09", aviso: "horario_ocupado" })
    );
    expect(escolhas.aviso).toBe("horario_ocupado");
    expect(montarQuery(escolhas)).toBe(
      "?servicos=s1&data=2026-09-09&aviso=horario_ocupado"
    );
  });

  it("não inclui aviso quando ele não existe", () => {
    expect(lerEscolhas(new URLSearchParams()).aviso).toBeUndefined();
    expect(montarQuery({ servicoIds: [] })).toBe("");
  });

  it("monta o caminho de cada passo com o que já foi escolhido", () => {
    const escolhas = { servicoIds: ["s1"], data: "2026-09-09" };
    expect(caminhoDoPasso("gr-barber", "horario", escolhas)).toBe(
      "/gr-barber/agendar/horario?servicos=s1&data=2026-09-09"
    );
    expect(caminhoDoPasso("gr-barber", "servicos", escolhas)).toBe(
      "/gr-barber/agendar?servicos=s1&data=2026-09-09"
    );
  });
});
