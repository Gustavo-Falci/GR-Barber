import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
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

// Componente de prova com estado local que força re-renders.
function ProvaComEstado() {
  const [contador, setContador] = useState(0);
  const resultado = usePassoDoFluxo("horario");
  return (
    <div>
      <p>pronto: {resultado.pronto ? "sim" : "não"}</p>
      <p>contador: {contador}</p>
      <button onClick={() => setContador((c) => c + 1)}>incrementar</button>
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

  it("chama replace exatamente uma vez mesmo com múltiplos re-renders", async () => {
    // A identidade do objeto `escolhas` muda a cada render porque é
    // recriado por `lerEscolhas`. Uma dependência que incluísse o objeto
    // inteiro dispararia o efeito novamente a cada commit, redirecionando
    // de novo e de novo. Este teste força vários re-renders mudando estado
    // local e verifica que replace foi chamado uma única vez.
    navegacaoFalsa.redefinir({
      query: { servicos: "s1" },
    });

    const user = userEvent.setup();
    render(<ProvaComEstado />);

    await waitFor(() => {
      expect(screen.getByText("pronto: não")).toBeInTheDocument();
    });

    // Força dois re-renders do componente mudando estado local, sem alterar
    // nada que o hook lê da query.
    await user.click(screen.getByRole("button", { name: "incrementar" }));
    await user.click(screen.getByRole("button", { name: "incrementar" }));

    // Com o array antigo contendo `escolhas`, replace seria chamado
    // múltiplas vezes. Com primitivas, é chamado uma única vez.
    expect(navegacaoFalsa.replace).toHaveBeenCalledTimes(1);
  });
});
