import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tabela } from "../../src/componentes/Tabela";

describe("Tabela", () => {
  it("mostra a mensagem vazia quando não há linhas, e não a tabela", () => {
    // O contrato inteiro do componente pra uma barbearia no primeiro
    // dia, sem nenhum cliente cadastrado ainda: sem este branch a
    // tabela apareceria com cabeçalho e zero linhas, em vez de dizer
    // que não há nada ali.
    render(<Tabela cabecalho={["Nome"]} linhas={[]} vazio="Nenhum cliente por aqui ainda." />);

    expect(screen.getByText("Nenhum cliente por aqui ainda.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("com linhas, mostra a tabela e não a mensagem vazia", async () => {
    const aoAbrir = vi.fn((_id: string) => {});
    render(
      <Tabela
        cabecalho={["Nome", "Telefone"]}
        vazio="Nenhum cliente por aqui ainda."
        aoAbrir={aoAbrir}
        linhas={[{ id: "c1", celulas: ["João Silva", "(11) 99999-8888"] }]}
      />
    );

    expect(screen.queryByText("Nenhum cliente por aqui ainda.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "João Silva" }));
    expect(aoAbrir).toHaveBeenCalledWith("c1");
  });
});
