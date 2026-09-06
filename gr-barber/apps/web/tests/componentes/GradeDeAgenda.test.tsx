import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GradeDeAgenda } from "../../src/componentes/GradeDeAgenda";

describe("GradeDeAgenda", () => {
  it("dia fechado mostra o aviso e nenhuma faixa", () => {
    render(<GradeDeAgenda faixas={[]} aoAbrir={vi.fn()} aoCriar={vi.fn()} />);

    expect(screen.getByText("Fechado neste dia.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
