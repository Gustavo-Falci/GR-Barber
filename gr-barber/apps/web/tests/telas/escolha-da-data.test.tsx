import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso } from "@gr-barber/api-client";
import { ProvedorDaApi } from "../../src/api/ProvedorDaApi";
import { EscolhaDaData } from "../../src/telas/EscolhaDaData";
import { navegacaoFalsa } from "../ajudantes/navegacao";

// Manhã do dia 9. O instante é prop, não relógio global: user-event
// trava sob fake timers, e estes testes clicam.
const MANHA = new Date("2026-09-09T10:00:00-03:00");

function montar(diasComVaga: Record<string, boolean>) {
  render(
    <ProvedorDaApi valor={criarApiClientFalso({ diasComVaga })}>
      <EscolhaDaData agora={MANHA} />
    </ProvedorDaApi>
  );
}

describe("escolha da data", () => {
  beforeEach(() => {
    navegacaoFalsa.redefinir({ query: { servicos: "s1" } });
  });

  it("desabilita dia sem vaga", async () => {
    montar({ "2026-09-10": true, "2026-09-11": false });
    await waitFor(() => screen.getByRole("button", { name: "10" }));

    expect(screen.getByRole("button", { name: "11" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "10" })).toBeEnabled();
  });

  it("desabilita dia passado mesmo quando a API diz que tem vaga", async () => {
    // A API não sabe que dia é hoje: /disponibilidade/mes marca ontem
    // como disponível. Quem barra é esta tela — sem isso o cliente
    // agenda no passado e tranca a própria conta.
    montar({ "2026-09-08": true, "2026-09-10": true });
    await waitFor(() => screen.getByRole("button", { name: "10" }));

    expect(screen.getByRole("button", { name: "8" })).toBeDisabled();
  });

  it("hoje continua escolhível", async () => {
    montar({ "2026-09-09": true });
    await waitFor(() => screen.getByRole("button", { name: "9" }));

    expect(screen.getByRole("button", { name: "9" })).toBeEnabled();
  });

  it("leva pro passo de horário com a data escolhida", async () => {
    montar({ "2026-09-10": true });
    await waitFor(() => screen.getByRole("button", { name: "10" }));

    await userEvent.click(screen.getByRole("button", { name: "10" }));

    expect(navegacaoFalsa.push).toHaveBeenCalledWith(
      "/gr-barber/agendar/horario?servicos=s1&data=2026-09-10"
    );
  });

  it("volta pro passo de serviços quando a URL não traz nenhum", async () => {
    navegacaoFalsa.redefinir({ query: {} });
    montar({});

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/gr-barber/agendar")
    );
  });

  it("avisa quando não consegue carregar a agenda, em vez de desenhar o mês como indisponível", async () => {
    // Slug diferente do da barbearia semeada: o dublê responde 404,
    // igual à API real com um slug que sumiu.
    navegacaoFalsa.redefinir({ slug: "outra", query: { servicos: "s1" } });
    montar({});

    await waitFor(() => screen.getByRole("heading"));

    // O ponto que importa: nenhum dia aparece. Um mês inteiro de
    // botões desabilitados seria indistinguível de uma agenda lotada.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
