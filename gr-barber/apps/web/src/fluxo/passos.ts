export interface Escolhas {
  servicoIds: string[];
  data?: string;
  hora?: string;
  // Quando presente, o fluxo está remarcando um agendamento existente
  // em vez de criar um novo.
  remarcar?: string;
}

export type Passo = "servicos" | "data" | "horario" | "dados" | "confirmar";

const CAMINHO_DO_PASSO: Record<Passo, string> = {
  servicos: "/agendar",
  data: "/agendar/data",
  horario: "/agendar/horario",
  dados: "/agendar/dados",
  confirmar: "/agendar/confirmar",
};

export function lerEscolhas(query: URLSearchParams): Escolhas {
  return {
    // O filter tira id vazio de uma vírgula solta: vazio viraria
    // ?servicoIds= na chamada, e o pattern de uuid da API responderia
    // 400.
    servicoIds: (query.get("servicos") ?? "")
      .split(",")
      .filter((id) => id.length > 0),
    data: query.get("data") ?? undefined,
    hora: query.get("hora") ?? undefined,
    remarcar: query.get("remarcar") ?? undefined,
  };
}

export function montarQuery(escolhas: Escolhas): string {
  const params = new URLSearchParams();
  if (escolhas.servicoIds.length > 0) {
    params.set("servicos", escolhas.servicoIds.join(","));
  }
  if (escolhas.data) params.set("data", escolhas.data);
  if (escolhas.hora) params.set("hora", escolhas.hora);
  if (escolhas.remarcar) params.set("remarcar", escolhas.remarcar);

  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

export function caminhoDoPasso(
  slug: string,
  passo: Passo,
  escolhas: Escolhas
): string {
  return `/${slug}${CAMINHO_DO_PASSO[passo]}${montarQuery(escolhas)}`;
}
