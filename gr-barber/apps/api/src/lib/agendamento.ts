import type { Prisma } from "@gr-barber/database";
import { calcularHorariosDisponiveis } from "@gr-barber/scheduling";
import { ErroDeNegocio } from "./erro-negocio";
import { dataParaDate, dateParaHora, horaParaDate, somarMinutos } from "./horas";

// O que as rotas precisam junto do agendamento: o nome de cada serviço
// (o preço vem congelado no AgendamentoServico) e o cliente, que a
// agenda do barbeiro mostra na linha.
export const INCLUDE_AGENDAMENTO = {
  servicos: { include: { servico: { select: { nome: true } } } },
  cliente: true,
} as const;

export interface CriarAgendamentoParams {
  barbeariaId: string;
  barbeiroId: string;
  clienteId: string;
  servicoIds: string[];
  data: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  origem: "cliente" | "barbeiro";
  observacoes?: string;
}

// Recebe o `tx` em vez de abrir a própria transação: o fluxo público
// precisa do upsert do cliente na mesma transação, senão um cliente novo
// ficaria cadastrado mesmo quando o agendamento é recusado.
export async function criarAgendamento(
  tx: Prisma.TransactionClient,
  params: CriarAgendamentoParams
) {
  const {
    barbeariaId,
    barbeiroId,
    clienteId,
    servicoIds,
    data,
    horaInicio,
    origem,
    observacoes,
  } = params;

  // O barbeiroId vem do corpo nos dois fluxos — no público, sem token
  // nenhum. Sem esta checagem dava pra encher a agenda de um barbeiro de
  // outra barbearia.
  const barbeiro = await tx.barbeiro.findFirst({
    where: { id: barbeiroId, barbeariaId, ativo: true },
    select: { id: true },
  });
  if (!barbeiro) {
    throw new ErroDeNegocio(
      "barbeiro não encontrado nesta barbearia",
      "barbeiro_invalido"
    );
  }

  // Serviços lidos do banco, e não do corpo: é daqui que saem preço e
  // duração. Confiar no corpo deixaria o cliente escolher quanto paga.
  //
  // Set porque a mesma lista com id repetido só conta uma vez — o
  // findMany devolveria uma linha só e a contagem não bateria.
  const idsUnicos = [...new Set(servicoIds)];
  const servicos = await tx.servico.findMany({
    where: { id: { in: idsUnicos }, barbeariaId },
  });

  if (servicos.length !== idsUnicos.length) {
    throw new ErroDeNegocio(
      "serviço não encontrado nesta barbearia",
      "servico_invalido"
    );
  }

  const inativo = servicos.find((servico) => !servico.ativo);
  if (inativo) {
    throw new ErroDeNegocio(
      `o serviço "${inativo.nome}" não está mais disponível`,
      "servico_inativo"
    );
  }

  const duracaoTotal = servicos.reduce(
    (soma, servico) => soma + servico.duracaoMinutos,
    0
  );

  let horaFim: string;
  try {
    horaFim = somarMinutos(horaInicio, duracaoTotal);
  } catch {
    // somarMinutos lança quando a soma passa da meia-noite. Isso é
    // pedido inválido, não bug: 422 em vez de 500.
    throw new ErroDeNegocio(
      "os serviços escolhidos passam da meia-noite",
      "duracao_invalida"
    );
  }

  // O pattern do schema garante a forma "YYYY-MM-DD", não que a data
  // exista: "2026-02-31" passa por ele e o dataParaDate lança. Sem este
  // try, seria um RangeError não tratado — 500 por culpa de quem chamou.
  let dataDate: Date;
  try {
    dataDate = dataParaDate(data);
  } catch {
    throw new ErroDeNegocio(`a data ${data} não existe`, "data_invalida");
  }

  // getUTCDay e não getDay: a Date foi construída em UTC por
  // dataParaDate, e o dia da semana tem que ser lido no mesmo fuso em
  // que foi escrito.
  const diaSemana = dataDate.getUTCDay();

  const janela = await tx.horarioFuncionamento.findUnique({
    where: { barbeariaId_diaSemana: { barbeariaId, diaSemana } },
  });

  // Só o que a trava do banco também considera: cancelado não ocupa
  // horário, o resto ocupa. As duas regras têm que concordar, senão o
  // cálculo oferece um horário que o banco recusa.
  const existentes = await tx.agendamento.findMany({
    where: { barbeiroId, data: dataDate, status: { not: "cancelado" } },
    select: { horaInicio: true, horaFim: true },
  });

  const horarios = calcularHorariosDisponiveis({
    horarioFuncionamento: {
      horaAbertura: janela?.horaAbertura
        ? dateParaHora(janela.horaAbertura)
        : null,
      horaFechamento: janela?.horaFechamento
        ? dateParaHora(janela.horaFechamento)
        : null,
      // Dia sem linha nenhuma é dia fechado — mesma regra do PUT de
      // horários da fase 3.
      fechado: janela?.fechado ?? true,
    },
    agendamentosExistentes: existentes.map((agendamento) => ({
      horaInicio: dateParaHora(agendamento.horaInicio),
      horaFim: dateParaHora(agendamento.horaFim),
    })),
    duracaoTotalMinutos: duracaoTotal,
  });

  // Esta checagem e a EXCLUDE constraint do banco são redundantes de
  // propósito, e as duas ficam. Esta dá a mensagem que a tela mostra
  // ("esse horário não está disponível") e cobre o que o banco não sabe
  // — dia fechado, fora do expediente, fora da grade. A do banco é a
  // única garantia real contra dois clientes confirmando ao mesmo tempo,
  // porque entre esta leitura e o insert existe uma janela.
  if (!horarios.includes(horaInicio)) {
    throw new ErroDeNegocio(
      "esse horário não está disponível",
      "horario_indisponivel"
    );
  }

  return tx.agendamento.create({
    data: {
      barbeariaId,
      barbeiroId,
      clienteId,
      data: dataDate,
      // horaParaDate e nada de `new Date(...)`: é o que impede o fuso da
      // máquina de entrar na coluna e corromper junto o `periodo`, de
      // onde sai a trava de conflito.
      horaInicio: horaParaDate(horaInicio),
      horaFim: horaParaDate(horaFim),
      origem,
      observacoes: observacoes ?? null,
      servicos: {
        create: servicos.map((servico) => ({
          servicoId: servico.id,
          // Congelados: o histórico tem que continuar dizendo quanto foi
          // cobrado no dia, mesmo depois de o preço mudar.
          precoNoMomento: servico.preco,
          duracaoNoMomento: servico.duracaoMinutos,
        })),
      },
    },
    include: INCLUDE_AGENDAMENTO,
  });
}

export type AgendamentoCriado = Awaited<ReturnType<typeof criarAgendamento>>;
