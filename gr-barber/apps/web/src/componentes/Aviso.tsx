import type { ReactNode } from "react";
import estilos from "./Aviso.module.css";

// `role="alert"` porque a mensagem aparece depois de uma ação da
// pessoa: sem ele, quem usa leitor de tela não fica sabendo.
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className={estilos.aviso} role="alert">
      {children}
    </p>
  );
}
