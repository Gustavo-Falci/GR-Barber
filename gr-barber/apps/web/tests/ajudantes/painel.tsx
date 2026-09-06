import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { criarApiClientFalso } from "@gr-barber/api-client";
import { ProvedorDoPainel } from "../../src/painel/ProvedorDoPainel";
import { SessaoDoPainel } from "../../src/painel/SessaoDoPainel";
import { sessaoDaBarbearia, sessaoDoBarbeiro } from "../../src/sessao/armazenamento";

// Grava a sessão antes de renderizar: sem token o SessaoDoPainel
// redireciona e não renderiza filho nenhum, e todo teste de tela do
// painel morreria na primeira asserção.
export function montarPainel(
  tela: ReactElement,
  falso = criarApiClientFalso()
) {
  sessaoDoBarbeiro.gravar("jwt-falso-barbeiro");
  sessaoDaBarbearia.gravar("gr-barber");

  render(
    <ProvedorDoPainel valor={{ barbeiro: falso.barbeiro, publico: falso.publico }}>
      <SessaoDoPainel>{tela}</SessaoDoPainel>
    </ProvedorDoPainel>
  );

  return falso;
}
