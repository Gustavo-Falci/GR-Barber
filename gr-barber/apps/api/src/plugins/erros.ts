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
    // statusCode — é isso que os dois branches abaixo consultam.
    const status = erro.statusCode ?? 500;

    // O @fastify/jwt lança com códigos próprios (FST_JWT_NO_AUTHORIZATION_IN_HEADER,
    // FST_JWT_AUTHORIZATION_TOKEN_INVALID e outros). Repassar esses nomes
    // crus colocaria o nome interno de um plugin dentro do contrato da
    // API — e as 23 telas passariam a ramificar em cima dele. Pra quem
    // consome, toda falha de token é a mesma coisa.
    //
    // Toda falha vinda do @fastify/jwt é falha de autenticação, inclusive
    // as duas que o plugin classifica como 400 (cabeçalho Authorization
    // malformado, cookie ilegível). Tratar as duas como 401 mantém o
    // nome interno do plugin fora do contrato, e descreve melhor o que
    // houve: quem manda um cabeçalho torto não está autenticado.
    if (status === 401 || erro.code?.startsWith("FST_JWT")) {
      return reply.code(401).send({ erro: "nao_autenticado" });
    }

    // A partir daqui sobra a validação de schema do Fastify (400).
    // O `erro` é sempre nosso: repassar o `erro.code` colocaria o
    // FST_ERR_VALIDATION do Fastify no contrato, o mesmo vazamento já
    // fechado logo acima pros FST_JWT_*. A `mensagem` do AJV continua
    // saindo porque diz ao cliente qual campo está errado — é o código
    // que precisa ser estável e livre de nome de framework.
    if (status < 500) {
      return reply
        .code(status)
        .send({ erro: "requisicao_invalida", mensagem: erro.message });
    }

    // Qualquer outra coisa é bug nosso: registra inteiro no log e
    // devolve genérico, pra não vazar detalhe interno.
    request.log.error(erro);
    return reply.code(500).send({ erro: "erro_interno" });
  });
}
