import { ErroDeNegocio } from "./erro-negocio";

// A coluna é VARCHAR e o par [barbeariaId, telefone] é único, então o
// Postgres compara caractere a caractere: sem normalizar, "11999998888",
// "(11) 99999-8888" e "+55 11 99999-8888" viram três clientes distintos
// da mesma pessoa na mesma barbearia. Isso furava a proteção do signup
// ("só define senha quem ainda não tem"), porque bastava reformatar o
// número pra ganhar outro cadastro reivindicável.
//
// Mesma função na gravação e na busca — igual ao normalizarEmail. Se só
// uma das pontas normalizar, ninguém acha o que a outra guardou.
const FORMATO_GUARDADO = "(AA) NNNNN-NNNN";

export function normalizarTelefone(
  telefone: string | null | undefined
): string | null {
  if (!telefone) return null;

  const digitos = telefone.replace(/\D/g, "");

  // 55 na frente de 12 ou 13 dígitos é o código do país, e sai. Em 10
  // dígitos ele é DDD de verdade (Santa Maria, RS) e fica — por isso a
  // checagem olha o comprimento, não só o prefixo.
  const semPais =
    (digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")
      ? digitos.slice(2)
      : digitos;

  const ddd = semPais.slice(0, 2);
  const assinante = semPais.slice(2);

  // 9 dígitos é celular, 8 é fixo. Qualquer outra contagem não vira
  // `${FORMATO_GUARDADO}`, e gravar assim mesmo daria à chave única um
  // valor que nenhuma outra ponta consegue reproduzir.
  if (assinante.length !== 9 && assinante.length !== 8) {
    throw new ErroDeNegocio(
      `o telefone ${telefone} não tem DDD e número no formato brasileiro`,
      "telefone_invalido"
    );
  }

  const corte = assinante.length - 4;
  return `(${ddd}) ${assinante.slice(0, corte)}-${assinante.slice(corte)}`;
}

// Onde o schema já exige o campo, o `null` acima é inalcançável. Este
// wrapper torna isso um fato de tipo, em vez de um `!` no chamador com a
// prova escondida num comentário.
export function normalizarTelefoneObrigatorio(telefone: string): string {
  const normalizado = normalizarTelefone(telefone);

  if (!normalizado) {
    throw new ErroDeNegocio("o telefone é obrigatório", "telefone_invalido");
  }

  return normalizado;
}

// Só os dígitos, pra comparar com o que o barbeiro digitou na busca. A
// coluna guarda pontuação, então procurar "999998888" cru nunca casaria
// com "(11) 99999-8888" — é preciso tirar a pontuação dos dois lados.
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}
