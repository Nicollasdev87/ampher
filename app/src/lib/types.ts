/**
 * Usuário com acesso ao app (login/senha). `senha_hash` só é usado
 * internamente pelas funções de autenticação (lib/auth.ts) — o resto do
 * app trabalha só com `UsuarioSessao` (sem o hash).
 */
export interface Usuario {
  id: string
  nome: string
  usuario: string
  senha_hash: string
  created_at?: string
}

export interface UsuarioSessao {
  id: string
  nome: string
  usuario: string
}

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
  observacao?: string | null
}

/**
 * Item predefinido do catálogo (Configurações → Itens predefinidos).
 * Serve pra padronizar descrição + valor unitário na hora de montar um
 * orçamento — a pessoa escolhe no select e os campos já vêm preenchidos.
 *
 * `categoria` é vinculada ao mesmo tipo do orçamento (Elétrica / Mecânica
 * / Outros), pra que o select de itens já venha filtrado pelo tipo
 * escolhido no passo 1. `subcategoria` é texto livre (ex: "Residencial",
 * "Industrial", "Comercial") usado só pra agrupar visualmente os itens
 * dentro de cada categoria.
 */
export interface ItemCatalogo {
  id: string
  categoria: TipoOrcamento
  subcategoria: string
  nome: string
  valor_unitario: number
  created_at?: string
}

/**
 * Cliente cadastrado (Clientes / seleção ao criar orçamento). Guarda
 * vários telefones (por isso o array) e, opcionalmente, uma localização
 * marcada no mapa (latitude/longitude) além do endereço em texto.
 */
export interface Cliente {
  id: string
  nome: string
  telefones: string[]
  endereco: string | null
  latitude: number | null
  longitude: number | null
  observacao?: string | null
  created_at?: string
}

export interface Orcamento {
  id?: string
  numero: number
  responsavel: string
  cliente_id?: string | null
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
