import type { AgendamentoComCliente, HorarioSerializado } from "@gr-barber/types";
import { hojeIso, horaJaPassou } from "../formato/datas";

// Uma linha da grade é 5 minutos. `duracaoMinutos` é multipleOf 5
// (apps/api/src/routers/servicos.ts:21) e os inícios caem na grade de 15
// do packages/scheduling: todo evento alinha exato, e nenhum cálculo
// aqui arredonda. Se algum precisar de Math.round, o cálculo está errado.
export const MINUTOS_POR_LINHA = 5;

// A granularidade que se OFERECE para criar, que é a do motor de
// disponibilidade — não a da grade. São números diferentes de propósito:
// a grade desenha em 5 para caber qualquer duração, e oferece em 15
// porque é o que a API aceita marcar.
const PASSO_LIVRE = 15;

export interface EventoPosicionado {
  agendamento: AgendamentoComCliente;
  linha: number; // 1-based, entra direto em grid-row
  linhas: number; // span
  pista: number; // 0-based, qual pista dentro do grupo sobreposto
  pistas: number; // quantas pistas o grupo tem
}

export interface FaixaLivre {
  hora: string; // "HH:mm" — o que vai na URL de novo agendamento
  linha: number;
  linhas: number;
  passada: boolean;
}

export interface ColunaDeDia {
  data: string;
  fechado: boolean;
  eventos: EventoPosicionado[];
  livres: FaixaLivre[];
}

export interface GradeDeTempo {
  minutoInicial: number;
  minutoFinal: number;
  totalLinhas: number;
  colunas: ColunaDeDia[];
  // Onde desenhar a régua do agora, ou null quando o instante não cai
  // em nenhum dos dias mostrados.
  agora: { data: string; linha: number } | null;
}

function emMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function emHora(minutos: number): string {
  const h = String(Math.floor(minutos / 60)).padStart(2, "0");
  const m = String(minutos % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function diaDaSemanaDe(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

function horarioDe(
  data: string,
  horarios: HorarioSerializado[]
): HorarioSerializado | undefined {
  return horarios.find((h) => h.diaSemana === diaDaSemanaDe(data));
}

// `fechado` vence as horas: os campos são independentes em
// HorarioSerializado, e esta função não pode depender da disciplina de
// quem a chama.
function aberto(
  horario: HorarioSerializado | undefined
): horario is HorarioSerializado & {
  horaAbertura: string;
  horaFechamento: string;
} {
  return Boolean(
    horario && !horario.fechado && horario.horaAbertura && horario.horaFechamento
  );
}

export function gradeDeTempo(entrada: {
  dias: string[];
  horarios: HorarioSerializado[];
  agendamentos: AgendamentoComCliente[];
  agora: Date;
}): GradeDeTempo {
  const { dias, horarios, agendamentos, agora } = entrada;

  // Só o que pertence aos dias mostrados: quem chama pode ter buscado um
  // intervalo maior (o mês busca a grade inteira).
  const doPeriodo = agendamentos.filter(
    (a) => dias.includes(a.data) && a.status !== "cancelado"
  );

  const aberturas = dias.map((d) => horarioDe(d, horarios)).filter(aberto);

  // A janela cobre o horário de funcionamento E todo agendamento que
  // exista. Agendamento fora do horário acontece: PATCH /horarios não
  // valida contra os já marcados, e deixá-lo fora da janela o tornaria
  // invisível — a pior falha possível nesta tela.
  const inicios = [
    ...aberturas.map((h) => emMinutos(h.horaAbertura)),
    ...doPeriodo.map((a) => emMinutos(a.horaInicio)),
  ];
  const fins = [
    ...aberturas.map((h) => emMinutos(h.horaFechamento)),
    ...doPeriodo.map((a) => emMinutos(a.horaFim)),
  ];

  const minutoInicial = inicios.length ? Math.min(...inicios) : 0;
  const minutoFinal = fins.length ? Math.max(...fins) : 0;
  const totalLinhas = Math.max(
    0,
    (minutoFinal - minutoInicial) / MINUTOS_POR_LINHA
  );

  const linhaDe = (minuto: number) =>
    (minuto - minutoInicial) / MINUTOS_POR_LINHA + 1;

  const colunas: ColunaDeDia[] = dias.map((data) => {
    const horario = horarioDe(data, horarios);
    const doDia = doPeriodo
      .filter((a) => a.data === data)
      .sort((um, outro) => um.horaInicio.localeCompare(outro.horaInicio));

    const eventos: EventoPosicionado[] = doDia.map((agendamento) => {
      const inicio = emMinutos(agendamento.horaInicio);
      const fim = emMinutos(agendamento.horaFim);
      return {
        agendamento,
        linha: linhaDe(inicio),
        linhas: (fim - inicio) / MINUTOS_POR_LINHA,
        pista: 0,
        pistas: 1,
      };
    });

    const livres: FaixaLivre[] = [];
    if (aberto(horario)) {
      const abre = emMinutos(horario.horaAbertura);
      const fecha = emMinutos(horario.horaFechamento);

      for (let minuto = abre; minuto < fecha; minuto += PASSO_LIVRE) {
        // Ocupado é qualquer minuto entre início e fim, não só o início:
        // é exatamente o que a grade antiga errava, e por isso oferecia
        // 09:15 como livre em cima de um corte das 09:00 às 10:00.
        const ocupado = doDia.some(
          (a) =>
            emMinutos(a.horaInicio) <= minuto && minuto < emMinutos(a.horaFim)
        );
        if (ocupado) continue;

        const hora = emHora(minuto);
        livres.push({
          hora,
          linha: linhaDe(minuto),
          linhas: PASSO_LIVRE / MINUTOS_POR_LINHA,
          passada: horaJaPassou(data, hora, agora),
        });
      }
    }

    return { data, fechado: !aberto(horario), eventos, livres };
  });

  const hoje = hojeIso(agora);
  const minutoAgora = agora.getHours() * 60 + agora.getMinutes();
  const mostrandoHoje = dias.includes(hoje);
  const dentroDaJanela =
    minutoAgora >= minutoInicial && minutoAgora < minutoFinal;

  return {
    minutoInicial,
    minutoFinal,
    totalLinhas,
    colunas,
    agora:
      mostrandoHoje && dentroDaJanela
        ? { data: hoje, linha: linhaDe(minutoAgora) }
        : null,
  };
}

// ---------------------------------------------------------------------
// Legado: a lista plana de faixas que a tela `AgendaDoDia` consome.
// Substituída por `gradeDeTempo` acima, e removida junto com aquela tela
// na tarefa que a troca pela nova `Agenda`. Vive aqui no meio-tempo só
// para que nenhum commit intermediário deixe a suíte vermelha.
// ---------------------------------------------------------------------

export interface Faixa {
  hora: string;
  agendamento: AgendamentoComCliente | null;
  passada: boolean;
}

export function faixasDoDia(entrada: {
  data: string;
  horario: HorarioSerializado | undefined;
  agendamentos: AgendamentoComCliente[];
  agora: Date;
  passo?: number;
}): Faixa[] {
  const { data, horario, agendamentos, agora, passo = PASSO_LIVRE } = entrada;
  if (!aberto(horario)) return [];

  const inicio = emMinutos(horario.horaAbertura);
  const fim = emMinutos(horario.horaFechamento);
  const faixas: Faixa[] = [];

  for (let minuto = inicio; minuto < fim; minuto += passo) {
    const hora = emHora(minuto);
    faixas.push({
      hora,
      agendamento:
        agendamentos.find(
          (a) => a.horaInicio === hora && a.status !== "cancelado"
        ) ?? null,
      passada: horaJaPassou(data, hora, agora),
    });
  }

  return faixas;
}

// Domingo a sábado, como a grade do design system e como o Calendario
// do fluxo do cliente.
export function diasDaSemana(data: string): string[] {
  const referencia = new Date(`${data}T00:00:00Z`);
  const domingo = new Date(referencia);
  domingo.setUTCDate(referencia.getUTCDate() - referencia.getUTCDay());

  return Array.from({ length: 7 }, (_, indice) => {
    const dia = new Date(domingo);
    dia.setUTCDate(domingo.getUTCDate() + indice);
    return dia.toISOString().slice(0, 10);
  });
}
