import {
  borderWidth,
  colors,
  fontSize,
  radius,
  spacing,
} from "@gr-barber/design-tokens";

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

// Os quatro grupos de medida viram custom property do mesmo jeito, só
// mudando o prefixo — o CSS Module de cada componente lê var(--espaco-md)
// em vez de repetir o número que o design system escolheu.
function varsEmPixels(
  prefixo: string,
  escala: Record<string, number>
): string {
  return Object.entries(escala)
    .map(([nome, valor]) => `  --${prefixo}-${nome}: ${valor}px;`)
    .join("\n");
}

const varsDeRaio = varsEmPixels("raio", radius);
const varsDeEspaco = varsEmPixels("espaco", spacing);
const varsDeBorda = varsEmPixels("borda", borderWidth);
const varsDeTexto = varsEmPixels("texto", fontSize);

// prefers-color-scheme por enquanto; quando existir troca manual de
// tema, virar [data-theme="dark"] no <html> e ler do localStorage.
export const cssDeTokens = `:root {
${varsDeCores(colors.light)}
${varsDeRaio}
${varsDeEspaco}
${varsDeBorda}
${varsDeTexto}
}

@media (prefers-color-scheme: dark) {
  :root {
${varsDeCores(colors.dark)}
  }
}`;
