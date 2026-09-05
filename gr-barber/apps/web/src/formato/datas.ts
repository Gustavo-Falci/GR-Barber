// Toda data trafega como "YYYY-MM-DD" e toda hora como "HH:mm", que é
// como a API fala. As duas comparam bem como string — zero à esquerda
// põe a ordem lexicográfica na mesma ordem do calendário e do relógio.

const FORMATADOR_LONGO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  // UTC, e não o fuso do aparelho: `new Date("2026-09-09")` é
  // meia-noite UTC, e em São Paulo isso ainda é dia 8.
  timeZone: "UTC",
});

export function formatarDataLonga(data: string): string {
  return FORMATADOR_LONGO.format(new Date(`${data}T00:00:00Z`));
}

// O instante entra por parâmetro, com `new Date()` como padrão — mesma
// forma do agoraNaBarbearia da API, e o que permite testar sem fake
// timers. O relógio é o do aparelho do cliente, não o da barbearia:
// limitação registrada na spec.
export function hojeIso(agora: Date = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function ehPassado(data: string, agora: Date = new Date()): boolean {
  return data < hojeIso(agora);
}

// Hora só "já passou" no dia de hoje: amanhã às 9 continua valendo por
// mais tarde que seja agora.
export function horaJaPassou(
  data: string,
  hora: string,
  agora: Date = new Date()
): boolean {
  if (data !== hojeIso(agora)) return false;
  const atual = `${String(agora.getHours()).padStart(2, "0")}:${String(
    agora.getMinutes()
  ).padStart(2, "0")}`;
  return hora <= atual;
}

// A grade do calendário começa no domingo, como no design system. Os
// `null` são as casas vazias antes do dia 1.
export function diasDoMes(mes: string): (string | null)[] {
  const [ano, numero] = mes.split("-").map(Number);
  const primeiro = new Date(Date.UTC(ano, numero - 1, 1));
  const ultimo = new Date(Date.UTC(ano, numero, 0)).getUTCDate();

  const vazios: null[] = Array(primeiro.getUTCDay()).fill(null);
  const dias = Array.from({ length: ultimo }, (_, indice) => {
    const dia = String(indice + 1).padStart(2, "0");
    return `${mes}-${dia}`;
  });

  return [...vazios, ...dias];
}
