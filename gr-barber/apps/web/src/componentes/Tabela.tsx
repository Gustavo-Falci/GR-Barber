import type { ReactNode } from "react";
import estilos from "./Tabela.module.css";

export interface Linha {
  id: string;
  celulas: ReactNode[];
}

export function Tabela({
  cabecalho,
  linhas,
  aoAbrir,
  vazio,
}: {
  cabecalho: string[];
  linhas: Linha[];
  aoAbrir?: (id: string) => void;
  vazio: string;
}) {
  if (linhas.length === 0) return <p>{vazio}</p>;

  return (
    <table className={estilos.tabela}>
      <thead>
        <tr>
          {cabecalho.map((titulo) => (
            <th key={titulo}>{titulo}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha.id}>
            {linha.celulas.map((celula, indice) => (
              <td key={indice}>
                {/* O botão fica na primeira célula, e não na <tr>: linha
                    clicável sem elemento focável não chega pelo teclado. */}
                {indice === 0 && aoAbrir ? (
                  <button type="button" onClick={() => aoAbrir(linha.id)}>
                    {celula}
                  </button>
                ) : (
                  celula
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
