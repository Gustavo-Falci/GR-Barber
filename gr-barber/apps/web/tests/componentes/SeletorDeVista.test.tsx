import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SeletorDeVista } from "../../src/componentes/SeletorDeVista";

function montar(entrada: {
  vista?: "dia" | "semana" | "mes";
  aoTrocarVista?: (vista: "dia" | "semana" | "mes") => void;
  aoAndar?: (passos: number) => void;
  aoVoltarAHoje?: () => void;
}) {
  render(
    <SeletorDeVista
      vista={entrada.vista ?? "semana"}
      aoTrocarVista={entrada.aoTrocarVista ?? (() => {})}
      aoAndar={entrada.aoAndar ?? (() => {})}
      aoVoltarAHoje={entrada.aoVoltarAHoje ?? (() => {})}
    />
  );
}

describe("SeletorDeVista", () => {
  it("marca a vista corrente e só ela", () => {
    montar({ vista: "mes" });

    expect(screen.getByRole("button", { name: "Mês" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Semana" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("troca de vista ao clicar", async () => {
    const aoTrocarVista = vi.fn((_vista: "dia" | "semana" | "mes") => {});
    montar({ vista: "semana", aoTrocarVista });

    await userEvent.click(screen.getByRole("button", { name: "Dia" }));

    expect(aoTrocarVista).toHaveBeenCalledWith("dia");
  });

  it("anda para trás e para a frente", async () => {
    const aoAndar = vi.fn((_passos: number) => {});
    montar({ aoAndar });

    await userEvent.click(screen.getByRole("button", { name: "Período anterior" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo período" }));

    expect(aoAndar).toHaveBeenNthCalledWith(1, -1);
    expect(aoAndar).toHaveBeenNthCalledWith(2, 1);
  });

  it("volta a hoje", async () => {
    const aoVoltarAHoje = vi.fn(() => {});
    montar({ aoVoltarAHoje });

    await userEvent.click(screen.getByRole("button", { name: "Hoje" }));

    expect(aoVoltarAHoje).toHaveBeenCalledTimes(1);
  });
});
