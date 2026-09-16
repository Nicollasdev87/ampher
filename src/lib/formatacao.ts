/**
 * Teto para qualquer campo em R$ do sistema — 999.999,99. Evita erro de
 * digitação virar um orçamento de milhões sem querer.
 */
export const VALOR_MAXIMO_REAIS = 999999.99

/**
 * Formata um telefone brasileiro conforme o usuário digita.
 * Aceita só dígitos (qualquer letra ou símbolo digitado é ignorado) e
 * limita a 11 números (DDD + celular com 9 dígitos).
 *
 *   "62"          -> "(62"
 *   "6299999"     -> "(62) 9999"
 *   "6232221234"  -> "(62) 3222-1234"   (fixo, 10 dígitos)
 *   "62999990000" -> "(62) 99999-0000"  (celular, 11 dígitos)
 */
export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  const len = digitos.length

  if (len === 0) return ''
  if (len <= 2) return `(${digitos}`
  if (len <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  if (len <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}
