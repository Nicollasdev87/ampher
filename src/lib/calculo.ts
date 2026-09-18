import type { Config, Dificuldade, ItemOrcamento } from './types'

/**
 * Regras de cálculo do orçamento — tudo centralizado aqui de propósito,
 * pra ser fácil de ajustar sem caçar número mágico espalhado pelo app.
 *
 * IMPORTANTE (regra de sigilo):
 * O multiplicador de dificuldade É aplicado no valor, mas nunca aparece
 * separado em lugar nenhum que o cliente veja (nem tela de revisão, nem PDF).
 * O "valor unitário" que sai no PDF já é o valor unitário com o risco embutido.
 */

export function valorUnitarioComRisco(
  valorUnitarioBase: number,
  dificuldade: Dificuldade | undefined
): number {
  const multiplicador = dificuldade?.multiplicador ?? 1
  return valorUnitarioBase * multiplicador
}

export function totalItem(
  item: Pick<ItemOrcamento, 'quantidade' | 'valor_unitario'>,
  dificuldade: Dificuldade | undefined
): number {
  return item.quantidade * valorUnitarioComRisco(item.valor_unitario, dificuldade)
}

export interface ResultadoCalculo {
  subtotalItens: number
  valorDeslocamentoTotal: number
  valorRefeicaoTotal: number
  valorDiariaTecnicosTotal: number
  subtotalGeral: number
  valorNfe: number
  totalAntesDesconto: number
  totalGeral: number
}

export function calcularOrcamento(params: {
  itens: ItemOrcamento[]
  dificuldades: Dificuldade[]
  dias: number
  numTecnicos: number
  /**
   * Quantos técnicos entram no cálculo da diária técnica. Existe separado
   * de `numTecnicos` por causa da pergunta "terá técnico adicional?": se a
   * resposta for "não", a diária técnica é 0, mas refeição e deslocamento
   * continuam sendo calculados normalmente (usando `numTecnicos`, que já
   * conta o técnico responsável). Se omitido, cai no comportamento antigo
   * (usa o mesmo valor de `numTecnicos`).
   */
  numTecnicosDiaria?: number
  desconto: number
  config: Config
}): ResultadoCalculo {
  const { itens, dificuldades, dias, numTecnicos, desconto, config } = params
  const numTecnicosDiaria = params.numTecnicosDiaria ?? numTecnicos

  const mapaDificuldades = new Map(dificuldades.map((d) => [d.id, d]))

  const subtotalItens = itens.reduce((acc, item) => {
    const dif = item.dificuldade_id ? mapaDificuldades.get(item.dificuldade_id) : undefined
    return acc + totalItem(item, dif)
  }, 0)

  // Deslocamento: valor fixo por dia (considera-se um único deslocamento por dia de execução).
  const valorDeslocamentoTotal = dias * (config.valor_deslocamento ?? 0)

  // Refeição: por técnico, por dia — considera todos os técnicos normalmente.
  const valorRefeicaoTotal = dias * numTecnicos * (config.valor_refeicao ?? 0)
  // Diária técnica: só entra para técnicos adicionais (0 se não houver).
  const valorDiariaTecnicosTotal = dias * numTecnicosDiaria * (config.valor_diaria_tecnico ?? 0)

  const subtotalGeral =
    subtotalItens + valorDeslocamentoTotal + valorRefeicaoTotal + valorDiariaTecnicosTotal

  const totalAntesDesconto = subtotalGeral - (desconto ?? 0)

  // NFe embutida como percentual sobre o valor já com desconto aplicado.
  const valorNfe = totalAntesDesconto * ((config.percentual_nfe ?? 0) / 100)

  const totalGeral = totalAntesDesconto + valorNfe

  return {
    subtotalItens,
    valorDeslocamentoTotal,
    valorRefeicaoTotal,
    valorDiariaTecnicosTotal,
    subtotalGeral,
    valorNfe,
    totalAntesDesconto,
    totalGeral,
  }
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
