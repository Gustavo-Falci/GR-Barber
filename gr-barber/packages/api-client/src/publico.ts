import type {
  AgendamentoSerializado,
  Disponibilidade,
  DisponibilidadeDoMes,
  NovoAgendamentoPublicoInput,
  PerfilPublicoBarbearia,
  ServicoSerializado,
  SessaoCliente,
} from "@gr-barber/types";
import type { Requisicao } from "./requisicao";

export interface FiltroDoDia {
  barbeiroId: string;
  data: string; // "YYYY-MM-DD"
  servicoIds: string[];
}

export interface FiltroDoMes {
  barbeiroId: string;
  mes: string; // "YYYY-MM"
  servicoIds: string[];
}

export interface CredenciaisDoCliente {
  telefone: string;
  senha: string;
}

export interface NovaContaDeCliente extends CredenciaisDoCliente {
  nome: string;
}

// Nenhuma destas manda token: são as telas abertas pelo link do
// WhatsApp, e a API as registra fora dos dois escopos protegidos.
export function criarApiPublica(requisicao: Requisicao) {
  return {
    perfilDaBarbearia(slug: string): Promise<PerfilPublicoBarbearia> {
      return requisicao(`/barbearias/${slug}`);
    },

    async servicos(slug: string): Promise<ServicoSerializado[]> {
      // A API embrulha em { servicos }. Desembrulhar aqui poupa a tela
      // de conhecer o formato do envelope.
      const resposta = await requisicao<{ servicos: ServicoSerializado[] }>(
        `/barbearias/${slug}/servicos`
      );
      return resposta.servicos;
    },

    async disponibilidadeDoDia(
      slug: string,
      filtro: FiltroDoDia
    ): Promise<string[]> {
      const resposta = await requisicao<Disponibilidade>(
        `/barbearias/${slug}/disponibilidade`,
        { query: { ...filtro } }
      );
      return resposta.horarios;
    },

    async disponibilidadeDoMes(
      slug: string,
      filtro: FiltroDoMes
    ): Promise<Record<string, boolean>> {
      const resposta = await requisicao<DisponibilidadeDoMes>(
        `/barbearias/${slug}/disponibilidade/mes`,
        { query: { ...filtro } }
      );
      return resposta.dias;
    },

    agendar(
      slug: string,
      novo: NovoAgendamentoPublicoInput
    ): Promise<AgendamentoSerializado> {
      return requisicao(`/barbearias/${slug}/agendamentos`, {
        metodo: "POST",
        corpo: novo,
      });
    },

    signupCliente(
      slug: string,
      conta: NovaContaDeCliente
    ): Promise<SessaoCliente> {
      return requisicao(`/barbearias/${slug}/auth/cliente/signup`, {
        metodo: "POST",
        corpo: conta,
      });
    },

    loginCliente(
      slug: string,
      credenciais: CredenciaisDoCliente
    ): Promise<SessaoCliente> {
      return requisicao(`/barbearias/${slug}/auth/cliente/login`, {
        metodo: "POST",
        corpo: credenciais,
      });
    },
  };
}
