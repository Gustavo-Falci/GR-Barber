import { describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "../src/index";

describe("criarApiClientFalso", () => {
  it("devolve o perfil semeado, no formato do client real", async () => {
    const falso = criarApiClientFalso();

    const perfil = await falso.publico.perfilDaBarbearia("gr-barber");

    expect(perfil.slug).toBe("gr-barber");
    // O fluxo público inteiro precisa deste id — é a razão de a fase 6
    // existir.
    expect(perfil.barbeiros).toHaveLength(1);
  });

  it("aceita estado semeado pelo teste da tela", async () => {
    const falso = criarApiClientFalso({
      horariosLivres: ["09:00", "14:30"],
    });

    const horarios = await falso.publico.disponibilidadeDoDia("gr-barber", {
      barbeiroId: "bb1",
      data: "2026-09-10",
      servicoIds: ["s1"],
    });

    expect(horarios).toEqual(["09:00", "14:30"]);
  });

  it("guarda o que foi agendado, pra tela seguinte enxergar", async () => {
    const falso = criarApiClientFalso();

    const agendamento = await falso.publico.agendar("gr-barber", {
      barbeiroId: "bb1",
      servicoIds: ["s1"],
      data: "2026-09-10",
      horaInicio: "09:00",
      cliente: { nome: "João", telefone: "(11) 99999-8888" },
    });

    expect(falso.estado.agendamentos).toContainEqual(agendamento);
  });

  it("lança ErroDaApi, e não Error cru, quando o slug não existe", async () => {
    // Se o falso lançasse outra coisa, o teste de tela que trata erro
    // passaria contra o dublê e quebraria contra a API real.
    const falso = criarApiClientFalso();

    await expect(
      falso.publico.perfilDaBarbearia("nao-existe")
    ).rejects.toBeInstanceOf(ErroDaApi);
  });

  it("responde horario_ocupado quando o horário já foi tomado", async () => {
    const falso = criarApiClientFalso({ horariosLivres: ["09:00"] });
    const agendar = () =>
      falso.publico.agendar("gr-barber", {
        barbeiroId: "bb1",
        servicoIds: ["s1"],
        data: "2026-09-10",
        horaInicio: "09:00",
        cliente: { nome: "João", telefone: "(11) 99999-8888" },
      });

    await agendar();

    try {
      await agendar();
      expect.unreachable("o segundo agendamento deveria ter sido recusado");
    } catch (erro) {
      expect((erro as ErroDaApi).codigo).toBe("horario_ocupado");
      expect((erro as ErroDaApi).status).toBe(409);
    }
  });

  it("não deixa um teste enxergar o estado do outro", async () => {
    // O dublê faz push em agendamentos e em servicos, e o padrão é um
    // objeto de módulo só: sem cópia, a segunda instância já nasceria
    // com o que a primeira agendou.
    const primeiro = criarApiClientFalso();
    await primeiro.publico.agendar("gr-barber", {
      barbeiroId: "bb1",
      servicoIds: ["s1"],
      data: "2026-09-10",
      horaInicio: "09:00",
      cliente: { nome: "João", telefone: "(11) 99999-8888" },
    });

    const segundo = criarApiClientFalso();

    expect(segundo.estado.agendamentos).toHaveLength(0);
  });
});
