import type {
  AgendamentoComCliente,
  AgendamentoSerializado,
  ClienteSerializado,
  HorarioSerializado,
  NovoAgendamentoBarbeiroInput,
  NovoAgendamentoPublicoInput,
  PerfilPublicoBarbearia,
  ServicoSerializado,
} from "@gr-barber/types";
import type {
  EdicaoDaBarbearia,
  EdicaoDoAgendamento,
  EdicaoDoCliente,
  EdicaoDoPerfil,
  EdicaoDoServico,
  NovoCliente,
  NovoServico,
} from "./barbeiro";
import type { EdicaoDoMeuCadastro, Remarcacao } from "./cliente";
import { ErroDaApi } from "./erro";
import type {
  CredenciaisDoCliente,
  FiltroDoDia,
  FiltroDoMes,
  NovaContaDeCliente,
} from "./publico";

export interface EstadoFalso {
  perfil: PerfilPublicoBarbearia;
  servicos: ServicoSerializado[];
  horariosLivres: string[];
  diasComVaga: Record<string, boolean>;
  agendamentos: AgendamentoSerializado[];
  cliente: ClienteSerializado;
}

const PERFIL_PADRAO: PerfilPublicoBarbearia = {
  id: "b1",
  nome: "GR Barber",
  slug: "gr-barber",
  telefone: "(11) 3333-4444",
  endereco: "Rua das Tesouras, 123",
  logoUrl: null,
  horarios: [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
    diaSemana,
    horaAbertura: diaSemana === 0 ? null : "09:00",
    horaFechamento: diaSemana === 0 ? null : "18:00",
    fechado: diaSemana === 0,
  })),
  barbeiros: [{ id: "bb1", nome: "Rafael" }],
};

const CLIENTE_PADRAO: ClienteSerializado = {
  id: "c1",
  nome: "João Silva",
  telefone: "(11) 99999-8888",
  email: null,
  temConta: true,
};

const SERVICOS_PADRAO: ServicoSerializado[] = [
  { id: "s1", nome: "Corte", duracaoMinutos: 30, preco: "40.00", ativo: true },
  { id: "s2", nome: "Barba", duracaoMinutos: 20, preco: "25.00", ativo: true },
];

// Dublê com estado em memória. Existe pra teste de tela rodar sem rede
// e sem Postgres; o que ele NÃO faz é provar que a API real responde
// assim — os tipos compartilhados pegam divergência de forma, não de
// comportamento.
export function criarApiClientFalso(semente: Partial<EstadoFalso> = {}) {
  // Cópia de toda lista, tanto do padrão quanto da semente: o dublê faz
  // `push` em `agendamentos` e em `servicos`, e sem a cópia dois testes
  // do mesmo arquivo veriam o estado um do outro — o padrão é um só
  // objeto de módulo, e a semente costuma ser reaproveitada.
  const estado: EstadoFalso = {
    perfil: semente.perfil ?? PERFIL_PADRAO,
    servicos: [...(semente.servicos ?? SERVICOS_PADRAO)],
    horariosLivres: [...(semente.horariosLivres ?? ["09:00", "09:30", "10:00"])],
    diasComVaga: { ...(semente.diasComVaga ?? {}) },
    agendamentos: [...(semente.agendamentos ?? [])],
    cliente: semente.cliente ?? CLIENTE_PADRAO,
  };

  function exigirSlug(slug: string): void {
    // Mesmo 404 que o findUniqueOrThrow da API produz.
    if (slug !== estado.perfil.slug) {
      throw new ErroDaApi(404, "nao_encontrado", "barbearia não encontrada");
    }
  }

  function duracaoDe(servicoIds: string[]): number {
    return servicoIds.reduce((total, id) => {
      const servico = estado.servicos.find((s) => s.id === id);
      return total + (servico?.duracaoMinutos ?? 0);
    }, 0);
  }

  function somarMinutos(hora: string, minutos: number): string {
    const [h, m] = hora.split(":").map(Number);
    const total = h * 60 + m + minutos;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
      total % 60
    ).padStart(2, "0")}`;
  }

  function novoAgendamento(entrada: {
    data: string;
    horaInicio: string;
    servicoIds: string[];
    origem: string;
    observacoes?: string;
  }): AgendamentoSerializado {
    // A trava do banco não deixa dois ativos no mesmo horário; o dublê
    // reproduz isso porque a tela precisa saber tratar horario_ocupado
    // mesmo tendo acabado de ver o horário como livre.
    const conflito = estado.agendamentos.some(
      (a) =>
        a.data === entrada.data &&
        a.horaInicio === entrada.horaInicio &&
        a.status !== "cancelado"
    );
    if (conflito) {
      throw new ErroDaApi(
        409,
        "horario_ocupado",
        "esse horário já está ocupado"
      );
    }

    const agendamento: AgendamentoSerializado = {
      id: `a${estado.agendamentos.length + 1}`,
      data: entrada.data,
      horaInicio: entrada.horaInicio,
      horaFim: somarMinutos(entrada.horaInicio, duracaoDe(entrada.servicoIds)),
      status: "pendente",
      origem: entrada.origem,
      observacoes: entrada.observacoes ?? null,
      servicos: entrada.servicoIds.map((servicoId) => {
        const servico = estado.servicos.find((s) => s.id === servicoId);
        return {
          servicoId,
          nome: servico?.nome ?? "Serviço",
          precoNoMomento: servico?.preco ?? "0.00",
          duracaoNoMomento: servico?.duracaoMinutos ?? 0,
        };
      }),
    };

    estado.agendamentos.push(agendamento);
    return agendamento;
  }

  function comCliente(
    agendamento: AgendamentoSerializado
  ): AgendamentoComCliente {
    return { ...agendamento, cliente: estado.cliente };
  }

  // Ajudantes que dois métodos chamam ficam aqui fora, e não como
  // `this.algo` dentro do objeto: o `this` de um método arrancado do
  // objeto (`const { cancelar } = falso.cliente`) chegaria undefined.
  function editarServico(
    id: string,
    edicao: EdicaoDoServico
  ): ServicoSerializado {
    const indice = estado.servicos.findIndex((s) => s.id === id);
    if (indice < 0) {
      throw new ErroDaApi(404, "nao_encontrado", "serviço não encontrado");
    }
    estado.servicos[indice] = { ...estado.servicos[indice], ...edicao };
    return estado.servicos[indice];
  }

  function cancelarAgendamento(id: string): AgendamentoSerializado {
    const indice = estado.agendamentos.findIndex((a) => a.id === id);
    if (indice < 0) {
      throw new ErroDaApi(404, "nao_encontrado", "agendamento não encontrado");
    }
    estado.agendamentos[indice] = {
      ...estado.agendamentos[indice],
      status: "cancelado",
    };
    return estado.agendamentos[indice];
  }

  const sessaoDoBarbeiro = {
    token: "jwt-falso-barbeiro",
    barbeiro: { id: "bb1", nome: "Rafael", email: "rafael@gr.com" },
    barbearia: {
      id: estado.perfil.id,
      nome: estado.perfil.nome,
      slug: estado.perfil.slug,
    },
  };

  return {
    estado,

    publico: {
      // Os tipos vêm dos mesmos que o client real usa, e não de um
      // subconjunto escrito à mão: com um subconjunto, o objeto literal
      // do teste com `cliente` dentro viraria erro de propriedade
      // excedente, e afrouxar o tipo esconderia divergência de verdade.
      async perfilDaBarbearia(slug: string) {
        exigirSlug(slug);
        return estado.perfil;
      },
      async servicos(slug: string) {
        exigirSlug(slug);
        return estado.servicos.filter((servico) => servico.ativo);
      },
      // O filtro entra na assinatura mesmo sem ser usado: um dublê com
      // menos parâmetros que o client real deixa a tela chamar de um
      // jeito que só quebra contra a API de verdade.
      async disponibilidadeDoDia(slug: string, _filtro: FiltroDoDia) {
        exigirSlug(slug);
        return estado.horariosLivres;
      },
      async disponibilidadeDoMes(slug: string, _filtro: FiltroDoMes) {
        exigirSlug(slug);
        return estado.diasComVaga;
      },
      async agendar(slug: string, novo: NovoAgendamentoPublicoInput) {
        exigirSlug(slug);
        return novoAgendamento({ ...novo, origem: "cliente" });
      },
      async signupCliente(slug: string, conta: NovaContaDeCliente) {
        exigirSlug(slug);
        estado.cliente = {
          ...estado.cliente,
          nome: conta.nome,
          temConta: true,
        };
        return { token: "jwt-falso-cliente", cliente: estado.cliente };
      },
      async loginCliente(slug: string, _credenciais: CredenciaisDoCliente) {
        exigirSlug(slug);
        return { token: "jwt-falso-cliente", cliente: estado.cliente };
      },
    },

    barbeiro: {
      async signup() {
        return sessaoDoBarbeiro;
      },
      async login() {
        return sessaoDoBarbeiro;
      },
      async meuPerfil() {
        return {
          id: "bb1",
          nome: "Rafael",
          email: "rafael@gr.com",
          telefone: null,
          barbeariaId: estado.perfil.id,
        };
      },
      async atualizarMeuPerfil(edicao: EdicaoDoPerfil) {
        return {
          id: "bb1",
          nome: edicao.nome ?? "Rafael",
          email: "rafael@gr.com",
          telefone: edicao.telefone ?? null,
          barbeariaId: estado.perfil.id,
        };
      },
      async atualizarMinhaBarbearia(edicao: EdicaoDaBarbearia) {
        estado.perfil = { ...estado.perfil, ...edicao };
        return estado.perfil;
      },
      async horarios() {
        return estado.perfil.horarios;
      },
      async salvarHorarios(horarios: HorarioSerializado[]) {
        estado.perfil = { ...estado.perfil, horarios };
        return horarios;
      },
      async servicos() {
        return estado.servicos;
      },
      async criarServico(novo: NovoServico) {
        const servico = {
          id: `s${estado.servicos.length + 1}`,
          ...novo,
          ativo: true,
        };
        estado.servicos.push(servico);
        return servico;
      },
      async atualizarServico(id: string, edicao: EdicaoDoServico) {
        return editarServico(id, edicao);
      },
      async desativarServico(id: string) {
        return editarServico(id, { ativo: false });
      },
      async clientes() {
        return [estado.cliente];
      },
      async criarCliente(novo: NovoCliente) {
        estado.cliente = { ...estado.cliente, ...novo };
        return estado.cliente;
      },
      async cliente(id: string) {
        if (id !== estado.cliente.id) {
          throw new ErroDaApi(404, "nao_encontrado", "cliente não encontrado");
        }
        return { ...estado.cliente, agendamentos: estado.agendamentos };
      },
      async atualizarCliente(id: string, edicao: EdicaoDoCliente) {
        if (id !== estado.cliente.id) {
          throw new ErroDaApi(404, "nao_encontrado", "cliente não encontrado");
        }
        estado.cliente = { ...estado.cliente, ...edicao };
        return estado.cliente;
      },
      async agendamentosDoDia(data: string) {
        return estado.agendamentos
          .filter((a) => a.data === data)
          .map(comCliente);
      },
      async agendamentosDoIntervalo(de: string, ate: string) {
        return estado.agendamentos
          .filter((a) => a.data >= de && a.data <= ate)
          .map(comCliente);
      },
      async agendamento(id: string) {
        const achado = estado.agendamentos.find((a) => a.id === id);
        if (!achado) {
          throw new ErroDaApi(
            404,
            "nao_encontrado",
            "agendamento não encontrado"
          );
        }
        return comCliente(achado);
      },
      async criarAgendamento(novo: NovoAgendamentoBarbeiroInput) {
        return comCliente(novoAgendamento({ ...novo, origem: "barbeiro" }));
      },
      async atualizarAgendamento(id: string, edicao: EdicaoDoAgendamento) {
        const indice = estado.agendamentos.findIndex((a) => a.id === id);
        if (indice < 0) {
          throw new ErroDaApi(
            404,
            "nao_encontrado",
            "agendamento não encontrado"
          );
        }
        estado.agendamentos[indice] = {
          ...estado.agendamentos[indice],
          ...edicao,
        };
        return comCliente(estado.agendamentos[indice]);
      },
    },

    cliente: {
      async meuCadastro() {
        return estado.cliente;
      },
      async atualizarMeuCadastro(edicao: EdicaoDoMeuCadastro) {
        estado.cliente = { ...estado.cliente, ...edicao };
        return estado.cliente;
      },
      async meusAgendamentos() {
        return estado.agendamentos;
      },
      async cancelar(id: string) {
        return cancelarAgendamento(id);
      },
      async remarcar(id: string, remarcacao: Remarcacao) {
        const antigo = estado.agendamentos.find((a) => a.id === id);
        if (!antigo) {
          throw new ErroDaApi(
            404,
            "nao_encontrado",
            "agendamento não encontrado"
          );
        }
        // Cancela antes de criar, na mesma ordem da transação da API —
        // é o que permite remarcar pra um horário que sobrepõe o
        // próprio agendamento.
        cancelarAgendamento(id);
        return novoAgendamento({
          data: remarcacao.data,
          horaInicio: remarcacao.horaInicio,
          servicoIds:
            remarcacao.servicoIds ?? antigo.servicos.map((s) => s.servicoId),
          origem: "cliente",
        });
      },
    },
  };
}
