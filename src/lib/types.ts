export type TipoOrcamento = 'Elétrica' | 'Mecânica' | 'Outros'

export type StatusOrcamento = 'pendente' | 'aprovado' | 'recusado' | 'concluido'

export const STATUS_LABEL: Record<StatusOrcamento, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  concluido: 'Concluído',
}

export const STATUS_OPCOES: StatusOrcamento[] = ['pendente', 'aprovado', 'recusado', 'concluido']

export interface Dificuldade {
  id: string
  nome: string
  multiplicador: number
  created_at?: string
}

export interface Config {
  id: string
  valor_deslocamento: number // por dia, valor fixo do deslocamento
  valor_refeicao: number // por técnico, por dia
  valor_diaria_tecnico: number // por técnico, por dia
  percentual_nfe: number // ex: 6 significa 6%
  validade_proposta_dias: number
}

export interface ItemOrcamento {
  id?: string
  orcamento_id?: string
  descricao: string
  quantidade: number
  valor_unitario: number
  dificuldade_id: string | null
  ordem: number
  secao?: string | null
}

export interface Orcamento {
  id?: string
  numero: number
  responsavel: string
  cliente_nome: string
  cliente_contato: string
  local_servico: string
  tipo: TipoOrcamento
  dias: number
  num_tecnicos: number
  desconto: number
  forma_pagamento: string
  prazo_execucao: string
  garantia_servico: string
  observacoes: string
  subtotal_itens: number
  valor_deslocamento_total: number
  valor_refeicao_total: number
  valor_diaria_tecnicos_total: number
  valor_nfe: number
  total_geral: number
  status?: StatusOrcamento
  created_at?: string
}

export interface OrcamentoCompleto extends Orcamento {
  itens: ItemOrcamento[]
}
