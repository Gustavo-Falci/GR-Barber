// Patterns de JSON Schema usados por mais de uma rota. `format: "uuid"`
// e `format: "email"` dependeriam do ajv-formats estar ligado no
// Fastify; pattern não depende de configuração nenhuma.

// Sem isto, um `:id` fora do formato chega no Prisma, o Postgres recusa
// o valor na coluna uuid e vira P2023 — que o tratador traduz pra 400,
// mas depois de uma ida ao banco e com mensagem genérica. Barrar no
// schema é mais barato e diz qual parâmetro está errado.
export const PADRAO_UUID =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

// Telefone brasileiro escrito de todo jeito: "11999998888",
// "(11) 99999-8888", "+55 11 99999-8888". A API guarda o que veio; quem
// formata é a tela.
export const PADRAO_TELEFONE = "^[0-9()+\\-\\s]{8,20}$";

// "HH:mm" em 24 horas. Mesmo formato que lib/horas.ts exige.
export const PADRAO_HORA = "^([01]\\d|2[0-3]):([0-5]\\d)$";

// Preço como string decimal, no máximo duas casas — o mesmo formato que
// sai na resposta. Number aqui perderia centavo no caminho.
export const PADRAO_PRECO = "^\\d{1,8}(\\.\\d{1,2})?$";

// `format: "email"` dependeria do ajv-formats estar ligado no Fastify;
// um pattern explícito não depende de configuração nenhuma.
export const PADRAO_EMAIL = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";

// "YYYY-MM-DD". O pattern só garante a forma; se a data existe mesmo
// (31 de fevereiro, por exemplo) quem decide é o dataParaDate.
export const PADRAO_DATA = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$";

// "YYYY-MM". O mês vai de 01 a 12 no próprio pattern — assim "2026-13"
// morre no schema, e não numa data inválida lá adiante.
export const PADRAO_MES = "^[0-9]{4}-(0[1-9]|1[0-2])$";
