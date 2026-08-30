import { colors, radius } from "@gr-barber/design-tokens";

// Os tokens são objetos JS puros (ver packages/design-tokens). No web
// a gente traduz pra CSS custom properties uma vez, no layout raiz,
// e daí em diante o CSS usa var(--cor-*) normalmente.
//
// O parâmetro é Record<string, string> e não Colors porque os tokens
// usam `as const`: colors.light e colors.dark acabam com tipos literais
// distintos, e o tipo Colors só descreve o claro.
function varsDeCores(tema: Record<string, string>): string {
  return Object.entries(tema)
    .map(([nome, valor]) => `  --cor-${kebab(nome)}: ${valor};`)
    .join("\n");
}

function kebab(nome: string): string {
  return nome.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`);
}

const varsDeRaio = Object.entries(radius)
  .map(([nome, valor]) => `  --raio-${nome}: ${valor}px;`)
  .join("\n");

// prefers-color-scheme por enquanto; quando existir troca manual de
// tema, virar [data-theme="dark"] no <html> e ler do localStorage.
export const cssDeTokens = `:root {
${varsDeCores(colors.light)}
${varsDeRaio}
}

@media (prefers-color-scheme: dark) {
  :root {
${varsDeCores(colors.dark)}
  }
}`;
