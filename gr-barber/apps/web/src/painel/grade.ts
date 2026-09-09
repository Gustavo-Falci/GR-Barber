import type { AgendamentoComCliente, HorarioSerializado } from "@gr-barber/types";
import { horaJaPassou } from "../formato/datas";

export interface Faixa {
  hora: string;
  agendamento: AgendamentoComCliente | null;
  passada: boolean;
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

// Isto é desenho de slot, não cálculo de disponibilidade: não decide se
// algo cabe, só mostra o que está lá. Quem responde "onde cabe um
// atendimento de duração D" é /disponibilidade, que exige servicoIds —
// e na agenda não há serviço escolhido.
export function faixasDoDia(entrada: {
  data: string;
  horario: HorarioSerializado | undefined;
  agendamentos: AgendamentoComCliente[];
  agora: Date;
  passo?: number;
}): Faixa[] {
  // 15 minutos, não 30: é a granularidade do motor que decide o que pode
  // ser marcado (packages/scheduling/src/index.ts, `intervaloMinutos`
  // padrão 15, candidatos alinhados à grade a partir da meia-noite), e a
  // API nunca valida `horaInicio` contra outra grade
  // (apps/api/src/lib/agendamento.ts, apps/api/src/lib/disponibilidade.ts
  // não passam outro valor). Um agendamento marcado às 09:15 pelo link do
  // cliente existe e ocupa a cadeira; se este passo voltar a 30 ele
  // desaparece da agenda sem aviso nenhum — a pior falha possível pra uma
  // tela que existe pra o barbeiro confiar no que vê.
  const { data, horario, agendamentos, agora, passo = 15 } = entrada;
  if (!horario || horario.fechado || !horario.horaAbertura || !horario.horaFechamento) {
    return [];
  }

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
