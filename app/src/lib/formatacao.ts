/**
 * Teto para qualquer campo em R$ do sistema — 999.999,99. Evita erro de
 * digitação virar um orçamento de milhões sem querer.
 */
export const VALOR_MAXIMO_REAIS = 999999.99

/**
 * Limite padrão de caracteres para campos de texto livre do sistema.
 */
export const TEXTO_MAXIMO_PADRAO = 80

/**
 * Limite de caracteres do campo de observação por item do orçamento.
 */
export const OBSERVACAO_ITEM_MAXIMO = 200

/**
 * Mantém, de uma string digitada livremente, só os dígitos e uma única
 * vírgula (a primeira que aparecer) — descarta letras, pontos, espaços
 * e vírgulas repetidas. Usado como etapa de "limpeza" antes de formatar
 * um campo de valor em R$.
 */
function extrairDigitosEVirgula(valor: string): string {
  const limpo = valor.replace(/[^\d,]/g, '')
  const idx = limpo.indexOf(',')
  if (idx === -1) return limpo
  return limpo.slice(0, idx + 1) + limpo.slice(idx + 1).replace(/,/g, '')
}

/**
 * Formata, EM TEMPO REAL (a cada tecla digitada), um valor em reais no
 * padrão brasileiro: separador de milhar "." e 2 casas decimais com ",".
 *
 * Ex: usuário digita "2500" -> exibe "R$ 2.500,00" imediatamente,
 * sem precisar digitar a vírgula ou os centavos.
 *
 * Se a pessoa quiser um valor com centavos diferentes de zero, é só
 * digitar a vírgula e os dígitos decimais (ex: "2500,90").
 */
export function formatarValorDigitado(bruto: string): string {
  const limpo = extrairDigitosEVirgula(bruto)
  const idxVirgula = limpo.indexOf(',')
  const parteInteira = idxVirgula === -1 ? limpo : limpo.slice(0, idxVirgula)
  const parteDecimal = idxVirgula === -1 ? undefined : limpo.slice(idxVirgula + 1).slice(0, 2)

  const inteiroSemZerosEsquerda = parteInteira.replace(/^0+(?=\d)/, '')
  const inteiroFormatado =
    inteiroSemZerosEsquerda === ''
      ? '0'
      : Number(inteiroSemZerosEsquerda).toLocaleString('pt-BR')

  if (parteDecimal === undefined) {
    return `R$ ${inteiroFormatado},00`
  }
  return `R$ ${inteiroFormatado},${parteDecimal}`
}

/**
 * Converte o texto bruto digitado (mesma limpeza usada em
 * `formatarValorDigitado`) para o número em reais que ele representa.
 * Espelha exatamente o que `formatarValorDigitado` exibe, pra nunca
 * "salvar" um valor diferente do que a pessoa está vendo na tela.
 */
export function valorDigitadoParaNumero(bruto: string): number {
  const limpo = extrairDigitosEVirgula(bruto)
  const idxVirgula = limpo.indexOf(',')
  const parteInteira = (idxVirgula === -1 ? limpo : limpo.slice(0, idxVirgula)) || '0'
  const parteDecimal = (idxVirgula === -1 ? '00' : limpo.slice(idxVirgula + 1).slice(0, 2)).padEnd(2, '0')
  const numero = parseFloat(`${parteInteira}.${parteDecimal}`)
  return Number.isNaN(numero) ? 0 : numero
}

/**
 * Converte um número em reais (ex: 2500.9) para o "buffer" bruto usado
 * como entrada de `formatarValorDigitado` (ex: "2500,90") — usado pra
 * reconstruir o campo formatado a partir de um valor vindo de fora
 * (banco de dados, prop `value`, etc).
 */
export function numeroParaBufferDigitado(numero: number): string {
  return numero.toFixed(2).replace('.', ',')
}

/**
 * Conta quantos caracteres "significativos" (dígitos ou vírgula) existem
 * numa string até a posição `pos` — usado pra descobrir, antes de formatar,
 * quantos dígitos o usuário já tinha digitado até onde o cursor estava.
 */
export function contarDigitosEVirgulaAte(valor: string, pos: number): number {
  let total = 0
  for (let i = 0; i < pos && i < valor.length; i++) {
    if (/[\d,]/.test(valor[i])) total++
  }
  return total
}

/**
 * Inverso de `contarDigitosEVirgulaAte`: encontra a posição, na string JÁ
 * FORMATADA, que fica logo depois do N-ésimo caractere significativo
 * (dígito ou vírgula). Usado pra recolocar o cursor no lugar certo depois
 * de reformatar um campo em R$ a cada tecla digitada — sem isso, o cursor
 * "pula" pro final do campo e os dígitos seguintes acabam caindo depois
 * dos centavos em vez de continuarem a parte inteira do valor.
 */
export function posAposNDigitosEVirgula(valorFormatado: string, n: number): number {
  if (n <= 0) return 0
  let total = 0
  for (let i = 0; i < valorFormatado.length; i++) {
    if (/[\d,]/.test(valorFormatado[i])) {
      total++
      if (total === n) return i + 1
    }
  }
  return valorFormatado.length
}

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
