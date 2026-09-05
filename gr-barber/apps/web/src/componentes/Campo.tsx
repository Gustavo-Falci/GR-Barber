"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { formatarTelefoneParcial } from "@gr-barber/formato";
import estilos from "./Campo.module.css";

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  rotulo: string;
  erro?: string;
  formato?: "telefone";
  onChange?: (valor: string) => void;
}

export function Campo({ rotulo, erro, formato, onChange, ...resto }: Props) {
  const id = useId();
  const [valor, setValor] = useState("");

  return (
    <div className={estilos.campo}>
      <label className={estilos.rotulo} htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className={estilos.entrada}
        aria-invalid={erro ? "true" : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        value={valor}
        onChange={(evento) => {
          // A API guarda um formato só e recusa os outros com 400.
          // Formatar aqui é o que evita o erro no envio; a validação
          // que lança continua sendo o normalizarTelefone.
          const proximo =
            formato === "telefone"
              ? formatarTelefoneParcial(evento.target.value)
              : evento.target.value;
          setValor(proximo);
          onChange?.(proximo);
        }}
        {...resto}
      />
      {erro ? (
        <span className={estilos.erro} id={`${id}-erro`}>
          {erro}
        </span>
      ) : null}
    </div>
  );
}
