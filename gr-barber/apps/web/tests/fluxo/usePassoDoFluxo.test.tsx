import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePassoDoFluxo } from "../../src/fluxo/usePassoDoFluxo";
import { navegacaoFalsa } from "../ajudantes/navegacao";

// Componente de prova que chama o hook e expõe seus valores pra assertion.
function ProvaDoFluxo({ passo }: { passo: "servicos" | "data" | "horario" | "dados" | "confirmar" }) {
  const resultado = usePassoDoFluxo(passo);
  return (
    <div>
      <p>pronto: {resultado.pronto ? "sim" : "não"}</p>
      <p>slug: {resultado.slug}</p>
      <p>servicoIds: {resultado.servicoIds.join(",")}</p>
      <p>data: {resultado.data ?? "vazio"}</p>
      <p>hora: {resultado.hora ?? "vazio"}</p>
    </div>
  );
}

describe("usePassoDoFluxo", () => {
  beforeEach(() => navegacaoFalsa.redefinir());

  it("retorna pronto=true quando o passo tem tudo que precisa", async () => {
    // Passo "horario" precisa de data. A query tem servicos e data, então
    // está pronto.
    navegacaoFalsa.redefinir({
      query: { servicos: "s1", data: "2026-09-09" },
    });

    render(<ProvaDoFluxo passo="horario" />);

    await waitFor(() => {
      expect(screen.getByText("pronto: sim")).toBeInTheDocument();
    });
    expect(navegacaoFalsa.replace).not.toHaveBeenCalled();
  });

  it("redireciona quando falta pré-requisito", async () => {
    // Passo "horario" precisa de data. A query só tem servicos, então
    // falta a data e deve redirecionar pra "data".
    navegacaoFalsa.redefinir({
      query: { servicos: "s1" },
    });

    render(<ProvaDoFluxo passo="horario" />);

    await waitFor(() => {
      expect(screen.getByText("pronto: não")).toBeInTheDocument();
    });
    expect(navegacaoFalsa.replace).toHaveBeenCalledWith(
      "/gr-barber/agendar/data?servicos=s1"
    );
  });

  it("chama replace exatamente uma vez, não a cada render", async () => {
    // Este teste invalida a dependência do array antigo ([ ... escolhas ]),
    // que dispararia o efeito de novo a cada render porque escolhas é um
    // novo objeto. Com primitivas no array, é chamado uma única vez.
    navegacaoFalsa.redefinir({
      query: { servicos: "s1" },
    });

    render(<ProvaDoFluxo passo="horario" />);

    await waitFor(() => {
      expect(navegacaoFalsa.replace).toHaveBeenCalledTimes(1);
    });
  });
});
