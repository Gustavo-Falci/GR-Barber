import type { ReactNode } from "react";

// O fluxo do cliente é sempre claro, mesmo com o sistema em escuro: é
// uma página que chega por link de WhatsApp pra quem não conhece o
// produto. Ver docs/design-system.html.
export default function LayoutPublico({ children }: { children: ReactNode }) {
  return <div data-theme="light">{children}</div>;
}
