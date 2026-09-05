import type { App } from "../../src/tipos";

export interface ClienteDeTeste {
  token: string;
  clienteId: string;
}

// Cria uma conta de cliente na barbearia do slug e devolve o token
// pronto. O telefone entra por parâmetro porque vários testes precisam
// de dois clientes na mesma barbearia — o segundo existe pra provar que
// o agendamento de um não é alcançável pelo outro.
export async function criarClienteComToken(
  app: App,
  slug: string,
  telefone = "11999998888"
): Promise<ClienteDeTeste> {
  const resposta = await app.inject({
    method: "POST",
    url: `/barbearias/${slug}/auth/cliente/signup`,
    payload: { nome: "João da Silva", telefone, senha: "senha-forte-123" },
  });

  // Sem esta guarda, um signup quebrado apareceria como "token
  // undefined" lá adiante, num 401 confuso a três arquivos de distância.
  if (resposta.statusCode !== 201) {
    throw new Error(
      `signup de cliente falhou no helper: ${resposta.statusCode} ${resposta.body}`
    );
  }

  const corpo = resposta.json();
  return { token: corpo.token, clienteId: corpo.cliente.id };
}
