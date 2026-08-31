// Regra de negócio violada — requisição bem formada, mas que o domínio
// recusa. Sempre vira 422, nunca 400 (400 é validação de schema) nem
// 500 (que é bug nosso).
export class ErroDeNegocio extends Error {
  readonly codigo: string;

  constructor(mensagem: string, codigo = "regra_de_negocio") {
    super(mensagem);
    this.name = "ErroDeNegocio";
    this.codigo = codigo;
  }
}
