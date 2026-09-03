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
