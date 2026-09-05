import { Suspense } from "react";
import { DadosDoCliente } from "../../../../../src/telas/DadosDoCliente";

export default function Pagina() {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <DadosDoCliente />
    </Suspense>
  );
}
