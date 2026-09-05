import { describe, expect, it } from "vitest";
import { prisma } from "@gr-barber/database";
import { buildApp } from "../../src/app";
import { auth, criarBarbeariaComToken } from "../helpers/barbearia";
import { criarClienteComToken } from "../helpers/cliente";
import type { App } from "../../src/tipos";

// Trinta dias à frente, calculado a cada rodada: uma data fixa começaria
// a falhar sozinha quando ficasse no passado, e fixar o relógio com
// vi.setSystemTime mexeria nos timeouts do pool do Postgres — que esta
// suíte usa de verdade. O `abrirTodoDia` abaixo abre os sete dias, então
// o dia da semana que calhar não muda o resultado.
function diaRelativo(dias: number): string {
  const dia = new Date();
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

const DIA = diaRelativo(30);

// A barbearia precisa de horário de funcionamento gravado, senão o
// motor de disponibilidade trata todo dia como fechado e nenhum
// horário é oferecido.
async function abrirTodoDia(app: App, token: string) {
  const dias = [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
    diaSemana,
    horaAbertura: "09:00",
    horaFechamento: "18:00",
    fechado: false,
  }));

  const resposta = await app.inject({
    method: "PUT",
    url: "/barbearias/me/horarios",
    headers: auth(token),
    payload: { horarios: dias },
  });

  if (resposta.statusCode !== 200) {
    throw new Error(`PUT de horários falhou: ${resposta.statusCode} ${resposta.body}`);
  }
}

async function criarServico(app: App, token: string) {
  const resposta = await app.inject({
    method: "POST",
    url: "/servicos",
    headers: auth(token),
    payload: { nome: "Corte", duracaoMinutos: 45, preco: "45.00" },
  });

  return resposta.json().id as string;
}

// O telefone é o que amarra o agendamento à conta: o POST público faz
// upsert do Cliente por `barbeariaId_telefone`, e o signup do cliente
// depois define a senha nesse mesmo cadastro. Por isso o padrão daqui e
// o de `criarClienteComToken` são o mesmo número — agendar primeiro e
// criar a conta depois faz o cliente dono do agendamento. Um telefone
// diferente é o que constrói o caso do "agendamento de outra pessoa".
async function agendar(params: {
  app: App;
  slug: string;
  barbeiroId: string;
  servicoId: string;
  horaInicio: string;
  telefone?: string;
}) {
  const resposta = await params.app.inject({
    method: "POST",
    url: `/barbearias/${params.slug}/agendamentos`,
    payload: {
      barbeiroId: params.barbeiroId,
      servicoIds: [params.servicoId],
      data: DIA,
      horaInicio: params.horaInicio,
      cliente: {
        nome: "João da Silva",
        telefone: params.telefone ?? "11999998888",
      },
    },
  });

  if (resposta.statusCode !== 201) {
    throw new Error(`agendamento falhou: ${resposta.statusCode} ${resposta.body}`);
  }

  return resposta.json().id as string;
}

describe("POST /clientes/me/agendamentos/:id/remarcar", () => {
  it("move o agendamento e cancela o antigo", async () => {
    const app = buildApp();
    const barbearia = await criarBarbeariaComToken(app);
    await abrirTodoDia(app, barbearia.token);
    const servicoId = await criarServico(app, barbearia.token);
    const antigoId = await agendar({
      app,
      slug: barbearia.slug,
      barbeiroId: barbearia.barbeiroId,
      servicoId,
      horaInicio: "10:00",
    });
    const { token } = await criarClienteComToken(app, barbearia.slug);

    const resposta = await app.inject({
      method: "POST",
      url: `/clientes/me/agendamentos/${antigoId}/remarcar`,
      headers: auth(token),
      payload: { data: DIA, horaInicio: "14:00" },
    });

    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().agendamento).toMatchObject({
      data: DIA,
      horaInicio: "14:00",
      horaFim: "14:45",
      status: "confirmado",
    });
    // Os serviços vieram do agendamento antigo, sem o corpo pedir.
    expect(resposta.json().agendamento.servicos[0].nome).toBe("Corte");

    const antigo = await prisma.agendamento.findUniqueOrThrow({
      where: { id: antigoId },
    });
    expect(antigo.status).toBe("cancelado");
  });

  it("aceita deslocar 15 minutos no mesmo dia, sobrepondo o próprio horário", async () => {
    const app = buildApp();
    const barbearia = await criarBarbeariaComToken(app);
    await abrirTodoDia(app, barbearia.token);
    const servicoId = await criarServico(app, barbearia.token);
    const antigoId = await agendar({
      app,
      slug: barbearia.slug,
      barbeiroId: barbearia.barbeiroId,
      servicoId,
      horaInicio: "10:00",
    });
    const { token } = await criarClienteComToken(app, barbearia.slug);

    // 10:15–11:00 sobrepõe 10:00–10:45. Só passa porque o cancelamento
    // do antigo acontece ANTES da criação, dentro da mesma transação.
    const resposta = await app.inject({
      method: "POST",
      url: `/clientes/me/agendamentos/${antigoId}/remarcar`,
      headers: auth(token),
      payload: { data: DIA, horaInicio: "10:15" },
    });

    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().agendamento.horaInicio).toBe("10:15");
  });

  it("horário tomado devolve 409 e deixa o antigo em pé", async () => {
    const app = buildApp();
    const barbearia = await criarBarbeariaComToken(app);
    await abrirTodoDia(app, barbearia.token);
    const servicoId = await criarServico(app, barbearia.token);
    const meuId = await agendar({
      app,
      slug: barbearia.slug,
      barbeiroId: barbearia.barbeiroId,
      servicoId,
      horaInicio: "10:00",
    });
    // Outra pessoa já ocupa as 14:00.
    await agendar({
      app,
      slug: barbearia.slug,
      barbeiroId: barbearia.barbeiroId,
      servicoId,
      horaInicio: "14:00",
      telefone: "11888887777",
    });
    const { token } = await criarClienteComToken(app, barbearia.slug);

    const resposta = await app.inject({
      method: "POST",
      url: `/clientes/me/agendamentos/${meuId}/remarcar`,
      headers: auth(token),
      payload: { data: DIA, horaInicio: "14:00" },
    });

    expect(resposta.statusCode).toBe(422);
    expect(resposta.json().erro).toBe("horario_indisponivel");

    // O ponto da transação: falhar a criação desfaz o cancelamento. O
    // cliente nunca fica sem agendamento nenhum.
    const meu = await prisma.agendamento.findUniqueOrThrow({
      where: { id: meuId },
    });
    expect(meu.status).toBe("confirmado");
  });

  it("422 quando o serviço herdado foi desativado", async () => {
    const app = buildApp();
    const barbearia = await criarBarbeariaComToken(app);
    await abrirTodoDia(app, barbearia.token);
    const servicoId = await criarServico(app, barbearia.token);
    const antigoId = await agendar({
      app,
      slug: barbearia.slug,
      barbeiroId: barbearia.barbeiroId,
      servicoId,
      horaInicio: "10:00",
    });
    const { token } = await criarClienteComToken(app, barbearia.slug);

    await app.inject({
      method: "DELETE",
      url: `/servicos/${servicoId}`,
      headers: auth(barbearia.token),
    });

    const resposta = await app.inject({
      method: "POST",
      url: `/clientes/me/agendamentos/${antigoId}/remarcar`,
      headers: auth(token),
      payload: { data: DIA, horaInicio: "14:00" },
    });

    // Soft delete: o serviço continua no histórico, mas não pode ser
    // reagendado. A tela tem que pedir os serviços de novo.
    expect(resposta.statusCode).toBe(422);
    expect(resposta.json().erro).toBe("servico_inativo");
  });

  it("404 no agendamento de outro cliente", async () => {
    const app = buildApp();
    const barbearia = await criarBarbeariaComToken(app);
    await abrirTodoDia(app, barbearia.token);
    const servicoId = await criarServico(app, barbearia.token);
    const alheioId = await agendar({
      app,
      slug: barbearia.slug,
      barbeiroId: barbearia.barbeiroId,
      servicoId,
      horaInicio: "10:00",
      telefone: "11888887777",
    });
    const { token } = await criarClienteComToken(app, barbearia.slug, "11999998888");

    const resposta = await app.inject({
      method: "POST",
      url: `/clientes/me/agendamentos/${alheioId}/remarcar`,
      headers: auth(token),
      payload: { data: DIA, horaInicio: "14:00" },
    });

    expect(resposta.statusCode).toBe(404);
  });
});
