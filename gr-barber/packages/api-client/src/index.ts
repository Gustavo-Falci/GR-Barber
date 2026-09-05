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
  CredenciaisDoCliente,
  FiltroDoDia,
  FiltroDoMes,
  NovaContaDeCliente,
} from "./publico";

export function criarApiClient(opcoes: OpcoesDoClient) {
  const requisicao = criarRequisicao(opcoes);

  return {
    publico: criarApiPublica(requisicao),
  };
}

export type ApiClient = ReturnType<typeof criarApiClient>;
