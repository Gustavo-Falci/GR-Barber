// Duas identidades, dois tokens. Os escopos da API recusam o token um
// do outro (autenticar rejeita payload de cliente e vice-versa), então
// guardar na mesma chave faria a primeira tela que misturasse as duas
// receber 401 sem explicação.
//
// localStorage é legível por XSS. A alternativa — cookie httpOnly posto
// por route handler do Next — obrigaria a proxiar a API inteira, e está
// registrada como dívida na spec desta fase.
export interface Sessao {
  ler(): string | null;
  gravar(token: string): void;
  limpar(): void;
}

function sessaoNaChave(chave: string): Sessao {
  return {
    ler() {
      // No servidor não existe localStorage, e o layout do painel roda
      // lá antes de hidratar.
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(chave);
    },
    gravar(token: string) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(chave, token);
    },
    limpar() {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(chave);
    },
  };
}

export const sessaoDoBarbeiro = sessaoNaChave("sessao.barbeiro");

// Por barbearia, porque o login do cliente é por barbearia: o token que
// vale em /barbearias/gr-barber não vale na de ninguém mais.
export function sessaoDoCliente(slug: string): Sessao {
  return sessaoNaChave(`sessao.cliente.${slug}`);
}
