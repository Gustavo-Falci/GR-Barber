import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt do node:crypto, sem dependência externa e sem node-gyp. O
// formato guardado carrega o salt junto, então trocar de parâmetro no
// futuro é possível sem invalidar as senhas já cadastradas: basta
// olhar o prefixo antes de conferir.
const scryptAsync = promisify(scrypt) as (
  senha: string,
  salt: Buffer,
  tamanho: number
) => Promise<Buffer>;

const TAMANHO_SALT = 16;
const TAMANHO_HASH = 64;

export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(TAMANHO_SALT);
  const hash = await scryptAsync(senha, salt, TAMANHO_HASH);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function conferirSenha(
  senha: string,
  guardado: string
): Promise<boolean> {
  const partes = guardado.split("$");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;

  const salt = Buffer.from(partes[1], "base64");
  const esperado = Buffer.from(partes[2], "base64");

  // timingSafeEqual estoura se os tamanhos diferem — conferir antes.
  if (esperado.length !== TAMANHO_HASH) return false;

  const calculado = await scryptAsync(senha, salt, TAMANHO_HASH);
  return timingSafeEqual(calculado, esperado);
}
