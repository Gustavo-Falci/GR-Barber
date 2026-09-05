import { criarApiBarbeiro } from "./barbeiro";
import { criarApiPublica } from "./publico";
import { criarRequisicao, type OpcoesDoClient } from "./requisicao";

export { ErroDaApi } from "./erro";
export { criarRequisicao } from "./requisicao";
export type {
  OpcoesDaChamada,
  OpcoesDoClient,
  Requisicao,
} from "./requisicao";
export type {
  ClienteComHistorico,
  CredenciaisDoBarbeiro,
  EdicaoDaBarbearia,
  EdicaoDoAgendamento,
  EdicaoDoCliente,
  EdicaoDoPerfil,
  EdicaoDoServico,
  NovaBarbearia,
  NovoCliente,
  NovoServico,
} from "./barbeiro";
export type {
  CredenciaisDoCliente,
  FiltroDoDia,
  FiltroDoMes,
  NovaContaDeCliente,
} from "./publico";

export function criarApiClient(opcoes: OpcoesDoClient) {
  const requisicao = criarRequisicao(opcoes);

  return {
    publico: criarApiPublica(requisicao),
    barbeiro: criarApiBarbeiro(requisicao),
  };
}

export type ApiClient = ReturnType<typeof criarApiClient>;
