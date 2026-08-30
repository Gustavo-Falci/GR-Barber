// O Prisma mapeia colunas @db.Time e @db.Date pra Date do JS e grava a
// porção UTC dela. Construir a Date a partir de string local ("09:00"
// numa máquina em America/Sao_Paulo) gravaria 12:00 no banco, sem erro
// nenhum, e corromperia junto a coluna `periodo` — de onde sai a trava
// de conflito de horário. Por isso todo Date que chega no banco nasce
// aqui, sempre com Date.UTC.

const PADRAO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PADRAO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function horaParaDate(hora: string): Date {
  const partes = PADRAO_HORA.exec(hora);
  if (!partes) throw new RangeError(`hora inválida: ${hora}`);
  return new Date(Date.UTC(1970, 0, 1, Number(partes[1]), Number(partes[2])));
}

export function dateParaHora(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function dataParaDate(data: string): Date {
  const partes = PADRAO_DATA.exec(data);
  if (!partes) throw new RangeError(`data inválida: ${data}`);

  const d = new Date(
    Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
  );

  // Date.UTC normaliza 2026-02-31 pra 2026-03-03 em silêncio. O caminho
  // de volta não bater é o que denuncia a data inexistente.
  if (dateParaData(d) !== data) throw new RangeError(`data inválida: ${data}`);
  return d;
}

export function dateParaData(d: Date): string {
  const ano = String(d.getUTCFullYear()).padStart(4, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function somarMinutos(hora: string, minutos: number): string {
  const base = horaParaDate(hora);
  const total = base.getUTCHours() * 60 + base.getUTCMinutes() + minutos;

  // Um agendamento que vira o dia inverteria o tsrange da coluna
  // `periodo`. Melhor recusar aqui, com mensagem clara.
  if (total >= 24 * 60) {
    throw new RangeError(`soma passa da meia-noite: ${hora} + ${minutos}min`);
  }

  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}
