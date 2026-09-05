import type { ReactNode } from "react";
import { ProvedorDaApi } from "../../../src/api/ProvedorDaApi";

// Server component: quem lê o slug é o provider, do lado do cliente,
// com useParams. Assim o `params` (que aqui seria uma Promise) não
// precisa ser aguardado só pra ser repassado.
export default function LayoutDaBarbearia({
  children,
}: {
  children: ReactNode;
}) {
  return <ProvedorDaApi>{children}</ProvedorDaApi>;
}
