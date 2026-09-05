import { Suspense } from "react";
import { EscolhaDoHorario } from "../../../../../src/telas/EscolhaDoHorario";

// O Suspense é exigência do Next 16: quem lê useSearchParams numa rota
// pré-renderizada precisa de um limite acima, senão o build recusa.
export default function Pagina() {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <EscolhaDoHorario />
    </Suspense>
  );
}
