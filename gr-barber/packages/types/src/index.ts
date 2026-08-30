// Os tipos de entidade (Barbearia, Agendamento, Servico...) agora
// vêm do @prisma/client gerado — reexportados por @gr-barber/database.
// Esse pacote guarda só os DTOs que existem por causa da API, não
// do banco: formatos de entrada/saída de endpoint, versões "seguras"
// de uma entidade sem campos sensíveis, etc.

// Versão pública do Cliente — nunca inclui senha_hash.
export interface ClientePublico {
  id: string;
  nome: string;
  telefone: string;
  temConta: boolean;
}

// Body de POST /agendamentos — o que o cliente envia pra criar
// um agendamento (o preço/duração de cada serviço são resolvidos
// no backend, não confiados no que o client manda).
export interface NovoAgendamentoInput {
  barbeariaId: string;
  barbeiroId: string;
  clienteId: string;
  servicoIds: string[];
  data: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  origem: "cliente" | "barbeiro";
  observacoes?: string;
}
