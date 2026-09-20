import type { LancamentoCaixa, TipoLancamento } from './types'

/**
 * Categorias fixas de saída — cobre os casos citados (ferramentas,
 * impostos) e as demais despesas comuns da operação. "Outros" sempre por
 * último, como saída-coringa.
 */
export const CATEGORIAS_SAIDA = [
  'Ferramentas e equipamentos',
  'Materiais e insumos',
  'Impostos e taxas',
  'Combustível e deslocamento',
  'Mão de obra / terceiros',
  'Manutenção',
  'Aluguel e infraestrutura',
  'Marketing',
  'Outros',
] as const

export const CATEGORIAS_ENTRADA = ['Recebimento de orçamento', 'Venda', 'Outros'] as const

export function categoriasPara(tipo: TipoLancamento): readonly string[] {
  return tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA
}

/** yyyy-mm-dd de hoje, no fuso local (evita o "dia -1" do toISOString em UTC). */
export function dataHojeISO(): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Ano/mês (1-12) atuais, no fuso local. */
export function mesAtual(): { ano: number; mes: number } {
  const hoje = new Date()
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
}

/** Primeiro e último dia (yyyy-mm-dd) de um ano/mês, pra filtrar por intervalo de data. */
export function intervaloDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  return { inicio, fim }
}

const NOMES_MES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function nomeMes(mes: number): string {
  return NOMES_MES[mes - 1] ?? ''
}

export function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export interface ResumoCaixa {
  totalEntradas: number
  totalSaidas: number
  saldo: number
  porCategoria: { categoria: string; total: number }[]
}

/** Soma entradas/saídas e agrupa saídas por categoria, maior valor primeiro. */
export function calcularResumo(lancamentos: LancamentoCaixa[]): ResumoCaixa {
  let totalEntradas = 0
  let totalSaidas = 0
  const porCategoriaMap = new Map<string, number>()

  for (const l of lancamentos) {
    if (l.tipo === 'entrada') {
      totalEntradas += l.valor
    } else {
      totalSaidas += l.valor
      porCategoriaMap.set(l.categoria, (porCategoriaMap.get(l.categoria) ?? 0) + l.valor)
    }
  }

  const porCategoria = Array.from(porCategoriaMap, ([categoria, total]) => ({ categoria, total })).sort(
    (a, b) => b.total - a.total
  )

  return { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas, porCategoria }
}
