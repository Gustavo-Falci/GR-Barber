// Os tipos de entidade (Barbearia, Agendamento, Servico...) agora
// vêm do @prisma/client gerado — reexportados por @gr-barber/database.
// Esse pacote guarda só os DTOs que existem por causa da API, não
// do banco: formatos de entrada/saída de endpoint, versões "seguras"
// de uma entidade sem campos sensíveis, etc.

// Versão pública do Cliente — nunca inclui senhaHash. É o formato que
// `serializarCliente` (apps/api/src/lib/serializar.ts) produz: o
// serializador importa este tipo, então divergir os dois quebra o
// type-check em vez de quebrar uma tela.
export interface ClientePublico {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  temConta: boolean;
}

// Body de POST /agendamentos — o walk-in que o barbeiro registra. O
// `barbeariaId` sai do token e a `origem` é fixa em "barbeiro": os dois
// no corpo seriam forjáveis, e é por isso que este tipo não os tem.
// Preço e duração de cada serviço são resolvidos no backend, nunca
// confiados no que o client manda.
export interface NovoAgendamentoBarbeiroInput {
  barbeiroId: string;
  clienteId: string;
  servicoIds: string[];
  data: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  observacoes?: string;
}

// Body de POST /barbearias/:slug/agendamentos — o cliente agendando pelo
// link público, sem conta. O `barbeariaId` sai do slug, a `origem` é fixa
// em "cliente", e o cliente é resolvido pelo telefone dentro daquela
// barbearia.
export interface NovoAgendamentoPublicoInput {
  barbeiroId: string;
  servicoIds: string[];
  data: string;
  horaInicio: string;
  cliente: { nome: string; telefone: string };
  observacoes?: string;
}

// Os DTOs de resposta moram aqui, e não em apps/api, pelo mesmo motivo
// do ClientePublico acima: o serializador importa o tipo, então
// divergir os dois quebra o type-check em vez de quebrar uma tela.

export interface BarbeariaSerializada {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  endereco: string | null;
  logoUrl: string | null;
}

export interface HorarioSerializado {
  diaSemana: number; // 0 = domingo
  horaAbertura: string | null; // "HH:mm"
  horaFechamento: string | null;
  fechado: boolean;
}

export interface ServicoSerializado {
  id: string;
  nome: string;
  duracaoMinutos: number;
  // String, nunca number: o preço é Decimal no banco e passar por float
  // perderia centavo. Ver serializarServico.
  preco: string;
  ativo: boolean;
}

// Um nome só, um formato só: a resposta da API e o tipo que web e
// mobile importam não têm como divergir em silêncio.
export type ClienteSerializado = ClientePublico;

export interface AgendamentoServicoSerializado {
  servicoId: string;
  nome: string;
  // Preço e duração congelados no dia do agendamento, nunca os de hoje.
  precoNoMomento: string;
  duracaoNoMomento: number;
}

export interface AgendamentoSerializado {
  id: string;
  data: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  horaFim: string;
  status: string;
  origem: string;
  observacoes: string | null;
  servicos: AgendamentoServicoSerializado[];
}

// As rotas do barbeiro devolvem o cliente junto porque a agenda mostra
// o nome em cada linha; as públicas nunca devolvem — quem sabe o
// telefone de alguém não pode puxar a agenda dessa pessoa.
export interface AgendamentoComCliente extends AgendamentoSerializado {
  cliente: ClienteSerializado;
}

// Resposta de GET /barbearias/:slug. O `barbeiros` é o que destrava o
// fluxo público inteiro: /disponibilidade e o POST público exigem
// barbeiroId, e esta é a única rota pública que o entrega.
export interface PerfilPublicoBarbearia extends BarbeariaSerializada {
  horarios: HorarioSerializado[];
  barbeiros: { id: string; nome: string }[];
}

export interface SessaoBarbeiro {
  token: string;
  barbeiro: { id: string; nome: string; email: string | null };
  barbearia: { id: string; nome: string; slug: string };
}

export interface SessaoCliente {
  token: string;
  cliente: ClienteSerializado;
}

export interface PerfilBarbeiro {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  barbeariaId: string;
}

// GET /barbearias/:slug/disponibilidade — horários de início livres.
export interface Disponibilidade {
  horarios: string[]; // "HH:mm"
}

// GET /barbearias/:slug/disponibilidade/mes — `true` no dia que tem
// pelo menos um horário livre. A rota não sabe que dia é hoje: quem
// desabilita o passado é a tela.
export interface DisponibilidadeDoMes {
  dias: Record<string, boolean>; // "YYYY-MM-DD" -> tem vaga
}
