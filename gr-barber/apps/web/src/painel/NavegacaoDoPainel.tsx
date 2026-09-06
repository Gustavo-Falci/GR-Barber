"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { aplicarTema, gravarTema, lerTema, temaDoSistema, type Tema } from "./tema";
import { usePainel } from "./SessaoDoPainel";
import estilos from "./NavegacaoDoPainel.module.css";

const LINKS = [
  { href: "/painel", rotulo: "Hoje" },
  { href: "/painel/agenda", rotulo: "Agenda" },
  { href: "/painel/clientes", rotulo: "Clientes" },
  { href: "/painel/servicos", rotulo: "Serviços" },
  { href: "/painel/configuracoes", rotulo: "Configurações" },
];

export function NavegacaoDoPainel() {
  const { slug, sair } = usePainel();
  const caminho = usePathname();
  const [tema, setTema] = useState<Tema>("claro");

  // O script do <head> já pintou; isto só põe o React em dia com o que
  // está no <html>, pra o botão mostrar o rótulo certo.
  useEffect(() => setTema(lerTema() ?? temaDoSistema()), []);

  function trocarTema() {
    const proximo: Tema = tema === "claro" ? "escuro" : "claro";
    setTema(proximo);
    gravarTema(proximo);
    aplicarTema(proximo);
  }

  return (
    <header className={estilos.barra}>
      <strong className={estilos.marca}>{slug}</strong>
      <nav className={estilos.links}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            // O "Hoje" é /painel exato: com startsWith, ele ficaria
            // ativo em todas as rotas do painel ao mesmo tempo.
            aria-current={
              (link.href === "/painel" ? caminho === link.href : caminho.startsWith(link.href))
                ? "page"
                : undefined
            }
          >
            {link.rotulo}
          </Link>
        ))}
      </nav>
      <button type="button" onClick={trocarTema}>
        {tema === "claro" ? "Modo escuro" : "Modo claro"}
      </button>
      <button type="button" onClick={sair}>
        Sair
      </button>
    </header>
  );
}
