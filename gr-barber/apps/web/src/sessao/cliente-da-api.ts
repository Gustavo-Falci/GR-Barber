import { criarApiClient } from "@gr-barber/api-client";
import { sessaoDoBarbeiro, sessaoDoCliente } from "./armazenamento";

// A URL da API muda por ambiente e é lida no navegador, então precisa
// do prefixo NEXT_PUBLIC_. O padrão é o dev local da API.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export function apiDoBarbeiro(fetchInjetado?: typeof globalThis.fetch) {
  return criarApiClient({
    baseUrl: BASE_URL,
    obterToken: () => sessaoDoBarbeiro.ler(),
    // Limpar aqui, e não em cada tela: o 401 chega de qualquer chamada,
    // e uma tela que esquecesse deixaria um token morto no navegador.
    aoExpirarSessao: () => sessaoDoBarbeiro.limpar(),
    fetch: fetchInjetado,
  }).barbeiro;
}

// Devolve o client inteiro, e não só `.cliente` como o de cima: o fluxo
// público usa `publico` antes de existir conta, e a mesma tela precisa
// de `cliente` depois do login. Separar em duas fábricas obrigaria a
// tela a saber de qual delas pedir cada chamada.
export function apiDoCliente(
  slug: string,
  fetchInjetado?: typeof globalThis.fetch
) {
  const sessao = sessaoDoCliente(slug);

  return criarApiClient({
    baseUrl: BASE_URL,
    obterToken: () => sessao.ler(),
    aoExpirarSessao: () => sessao.limpar(),
    fetch: fetchInjetado,
  });
}
