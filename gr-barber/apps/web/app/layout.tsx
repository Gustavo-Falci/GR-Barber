import type { Metadata } from "next";

import { clashGrotesk, inter } from "./fontes";
import { cssDeTokens } from "./tokens-css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GR Barber",
  description: "Agenda de barbearia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // As duas fontes entram como variável CSS, não como className de
    // família: o CSS Module de cada componente escolhe qual usar via
    // var(--fonte-display) ou var(--fonte-corpo).
    <html lang="pt-BR" className={`${clashGrotesk.variable} ${inter.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssDeTokens }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
