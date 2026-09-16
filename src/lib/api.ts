import { supabase } from './supabase'
import type { Config, Dificuldade, Orcamento, OrcamentoCompleto, ItemOrcamento, ItemCatalogo } from './types'

// ---------- Config ----------

export async function getConfig(): Promise<Config> {
  const { data, error } = await supabase.from('config').select('*').single()
  if (error) throw error
  return data as Config
}

export async function atualizarConfig(config: Partial<Config> & { id: string }): Promise<Config> {
  const { data, error } = await supabase
    .from('config')
    .update(config)
    .eq('id', config.id)
    .select()
    .single()
  if (error) throw error
  return data as Config
}

// ---------- Dificuldades ----------

export async function listarDificuldades(): Promise<Dificuldade[]> {
  const { data, error } = await supabase
    .from('dificuldades')
    .select('*')
    .order('multiplicador', { ascending: true })
  if (error) throw error
  return data as Dificuldade[]
}

export async function criarDificuldade(nome: string, multiplicador: number): Promise<Dificuldade> {
  const { data, error } = await supabase
    .from('dificuldades')
    .insert({ nome, multiplicador })
    .select()
    .single()
  if (error) throw error
  return data as Dificuldade
}

export async function atualizarDificuldade(
  id: string,
  nome: string,
  multiplicador: number
): Promise<Dificuldade> {
  const { data, error } = await supabase
    .from('dificuldades')
    .update({ nome, multiplicador })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Dificuldade
}

export async function removerDificuldade(id: string): Promise<void> {
  const { error } = await supabase.from('dificuldades').delete().eq('id', id)
  if (error) throw error
}

// ---------- Itens predefinidos (catálogo) ----------

export async function listarItensCatalogo(): Promise<ItemCatalogo[]> {
  const { data, error } = await supabase
    .from('itens_catalogo')
    .select('*')
    .order('categoria', { ascending: true })
    .order('nome', { ascending: true })
  if (error) throw error
  return data as ItemCatalogo[]
}

export async function criarItemCatalogo(
  categoria: string,
  nome: string,
  valor_unitario: number
): Promise<ItemCatalogo> {
  const { data, error } = await supabase
    .from('itens_catalogo')
    .insert({ categoria, nome, valor_unitario })
    .select()
    .single()
  if (error) throw error
  return data as ItemCatalogo
}

export async function atualizarItemCatalogo(
  id: string,
  patch: Partial<Pick<ItemCatalogo, 'categoria' | 'nome' | 'valor_unitario'>>
): Promise<ItemCatalogo> {
  const { data, error } = await supabase
    .from('itens_catalogo')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ItemCatalogo
}

export async function removerItemCatalogo(id: string): Promise<void> {
  const { error } = await supabase.from('itens_catalogo').delete().eq('id', id)
  if (error) throw error
}

// ---------- Orçamentos ----------

export async function proximoNumeroOrcamento(): Promise<number> {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return 1
  return (data[0].numero as number) + 1
}

export async function criarOrcamento(
  orcamento: Orcamento,
  itens: ItemOrcamento[]
): Promise<OrcamentoCompleto> {
  const { data: orcamentoCriado, error: erroOrcamento } = await supabase
    .from('orcamentos')
    .insert(orcamento)
    .select()
    .single()
  if (erroOrcamento) throw erroOrcamento

  const itensParaInserir = itens.map((item, idx) => ({
    ...item,
    orcamento_id: orcamentoCriado.id,
    ordem: idx,
  }))

  const { data: itensCriados, error: erroItens } = await supabase
    .from('itens_orcamento')
    .insert(itensParaInserir)
    .select()
  if (erroItens) throw erroItens

  return { ...(orcamentoCriado as Orcamento), itens: itensCriados as ItemOrcamento[] }
}

export async function buscarOrcamentos(termo: string): Promise<Orcamento[]> {
  const numero = Number(termo)
  let query = supabase.from('orcamentos').select('*').order('created_at', { ascending: false })

  if (termo.trim() === '') {
    query = query.limit(30)
  } else if (!Number.isNaN(numero) && termo.trim() !== '') {
    query = query.or(`numero.eq.${numero},cliente_nome.ilike.%${termo}%`)
  } else {
    query = query.ilike('cliente_nome', `%${termo}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Orcamento[]
}

export async function atualizarOrcamento(
  id: string,
  patch: Partial<Orcamento>,
  itens?: ItemOrcamento[]
): Promise<OrcamentoCompleto> {
  const { data: orcamentoAtualizado, error: erroOrcamento } = await supabase
    .from('orcamentos')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (erroOrcamento) throw erroOrcamento

  let itensFinais: ItemOrcamento[]
  if (itens) {
    // Substitui todos os itens: mais simples e seguro do que tentar
    // reconciliar inserts/updates/deletes item a item.
    const { error: erroRemover } = await supabase
      .from('itens_orcamento')
      .delete()
      .eq('orcamento_id', id)
    if (erroRemover) throw erroRemover

    const itensParaInserir = itens.map((item, idx) => ({
      ...item,
      id: undefined,
      orcamento_id: id,
      ordem: idx,
    }))
    const { data: itensCriados, error: erroItens } = await supabase
      .from('itens_orcamento')
      .insert(itensParaInserir)
      .select()
    if (erroItens) throw erroItens
    itensFinais = itensCriados as ItemOrcamento[]
  } else {
    const { data: itensExistentes, error: erroItens } = await supabase
      .from('itens_orcamento')
      .select('*')
      .eq('orcamento_id', id)
      .order('ordem', { ascending: true })
    if (erroItens) throw erroItens
    itensFinais = itensExistentes as ItemOrcamento[]
  }

  return { ...(orcamentoAtualizado as Orcamento), itens: itensFinais }
}

export async function atualizarStatusOrcamento(
  id: string,
  status: Orcamento['status']
): Promise<void> {
  const { error } = await supabase.from('orcamentos').update({ status }).eq('id', id)
  if (error) throw error
}

export async function excluirOrcamento(id: string): Promise<void> {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id)
  if (error) throw error
}

export async function buscarOrcamentoCompleto(id: string): Promise<OrcamentoCompleto> {
  const { data: orcamento, error: erroOrcamento } = await supabase
    .from('orcamentos')
    .select('*')
    .eq('id', id)
    .single()
  if (erroOrcamento) throw erroOrcamento

  const { data: itens, error: erroItens } = await supabase
    .from('itens_orcamento')
    .select('*')
    .eq('orcamento_id', id)
    .order('ordem', { ascending: true })
  if (erroItens) throw erroItens

  return { ...(orcamento as Orcamento), itens: itens as ItemOrcamento[] }
}
