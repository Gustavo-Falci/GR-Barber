import type { ReactNode } from "react";

// O painel acompanha o tema do sistema — o design system tem as seis
// telas nos dois modos. A troca manual entra junto do painel, no
// sub-projeto C.
export default function LayoutPainel({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
