/**
 * Regras de senha do app: entre 8 e 15 caracteres, com pelo menos uma
 * letra maiúscula, uma minúscula, um número e um caractere especial.
 *
 * `validarSenha` devolve `null` quando a senha é válida, ou a primeira
 * regra violada (em texto, pra mostrar direto no formulário).
 */

export const SENHA_MIN = 8
export const SENHA_MAX = 15

const TEM_MINUSCULA = /[a-z]/
const TEM_MAIUSCULA = /[A-Z]/
const TEM_NUMERO = /[0-9]/
// Qualquer caractere que não seja letra (com ou sem acento) nem número
// conta como "especial" (ex: ! @ # $ % & * - _ . , etc.)
const TEM_ESPECIAL = /[^A-Za-zÀ-ÿ0-9]/

export function validarSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN || senha.length > SENHA_MAX) {
    return `A senha deve ter entre ${SENHA_MIN} e ${SENHA_MAX} caracteres.`
  }
  if (!TEM_MAIUSCULA.test(senha)) return 'A senha deve ter ao menos uma letra maiúscula.'
  if (!TEM_MINUSCULA.test(senha)) return 'A senha deve ter ao menos uma letra minúscula.'
  if (!TEM_NUMERO.test(senha)) return 'A senha deve ter ao menos um número.'
  if (!TEM_ESPECIAL.test(senha)) return 'A senha deve ter ao menos um caractere especial (ex: ! @ # $ %).'
  return null
}

/**
 * Regra visual (checklist) exibida embaixo do campo de senha nos
 * formulários de cadastro/redefinição, pra pessoa ver em tempo real
 * quais requisitos já foram atendidos.
 */
export function regrasSenha(senha: string) {
  return [
    { label: `${SENHA_MIN} a ${SENHA_MAX} caracteres`, ok: senha.length >= SENHA_MIN && senha.length <= SENHA_MAX },
    { label: 'Uma letra maiúscula', ok: TEM_MAIUSCULA.test(senha) },
    { label: 'Uma letra minúscula', ok: TEM_MINUSCULA.test(senha) },
    { label: 'Um número', ok: TEM_NUMERO.test(senha) },
    { label: 'Um caractere especial', ok: TEM_ESPECIAL.test(senha) },
  ]
}
