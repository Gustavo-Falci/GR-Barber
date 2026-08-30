import type { FastifyError } from "fastify";
import { Prisma } from "@gr-barber/database";
import { ErroDeNegocio } from "../lib/erro-negocio";
import type { App } from "../tipos";

// Um lugar só traduzindo erro de domínio e de banco pra HTTP. Sem isso,
// cada rota repetiria try/catch e o formato da resposta divergiria.
export function registrarTratamentoDeErros(app: App): void {
  app.setErrorHandler<FastifyError>((erro, request, reply) => {
    if (erro instanceof ErroDeNegocio) {
      return reply
        .code(422)
        .send({ erro: erro.codigo, mensagem: erro.message });
    }

    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: findUniqueOrThrow/update não achou o registro.
      if (erro.code === "P2025") {
        return reply.code(404).send({ erro: "nao_encontrado" });
      }
      // P2002: violação de unique (slug de barbearia, email, telefone).
      if (erro.code === "P2002") {
        return reply.code(409).send({ erro: "conflito" });
      }
    }

    // Validação de schema do Fastify e erros de JWT já vêm com
    // statusCode. Repassar preservando o código.
    const status = erro.statusCode ?? 500;
    if (status < 500) {
      return reply
        .code(status)
        .send({ erro: erro.code ?? "requisicao_invalida", mensagem: erro.message });
    }

    // Qualquer outra coisa é bug nosso: registra inteiro no log e
    // devolve genérico, pra não vazar detalhe interno.
    request.log.error(erro);
    return reply.code(500).send({ erro: "erro_interno" });
  });
}
