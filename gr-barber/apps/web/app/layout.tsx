import type { Metadata } from "next";

import { cssDeTokens } from "./tokens-css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GR Barber",
  description: "Painel do barbeiro",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssDeTokens }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
