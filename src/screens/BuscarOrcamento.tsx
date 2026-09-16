import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Field, NumberField, SelectField } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import type {
  Config,
  Dificuldade,
  ItemOrcamento,
  Orcamento,
  OrcamentoCompleto,
  StatusOrcamento,
  TipoOrcamento,
} from '../lib/types'
import { STATUS_LABEL, STATUS_OPCOES } from '../lib/types'
import {
  atualizarOrcamento,
  atualizarStatusOrcamento,
  buscarOrcamentoCompleto,
  buscarOrcamentos,
  excluirOrcamento,
  getConfig,
  listarDificuldades,
} from '../lib/api'
import { calcularOrcamento, formatarMoeda, totalItem } from '../lib/calculo'
import { baixarPdfOrcamento } from '../lib/pdf'

const TIPOS: TipoOrcamento[] = ['Elétrica', 'Mecânica', 'Outros']

const STATUS_ESTILO: Record<StatusOrcamento, string> = {
  pendente: 'bg-brass/15 text-brass-dark',
  aprovado: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  recusado: 'bg-red-500/15 text-red-600 dark:text-red-400',
  concluido: 'bg-ink text-paper',
}

function StatusBadge({ status }: { status?: StatusOrcamento }) {
  const s = status ?? 'pendente'
  return (
    <span className={`inline-block px-2.5 py-1 text-[11px] font-medium tracking-wide ${STATUS_ESTILO[s]}`}>
      {STATUS_LABEL[s]}
    </span>
  )
}

export function BuscarOrcamento({ onVoltar: _onVoltarInicio }: { onVoltar: () => void }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Orcamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [selecionado, setSelecionado] = useState<OrcamentoCompleto | null>(null)
  const [dificuldades, setDificuldades] = useState<Dificuldade[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [baixando, setBaixando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  // ---- Edição ----
  const [editando, setEditando] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)
  const [edResponsavel, setEdResponsavel] = useState('')
  const [edClienteNome, setEdClienteNome] = useState('')
  const [edClienteContato, setEdClienteContato] = useState('')
  const [edLocalServico, setEdLocalServico] = useState('')
  const [edNomeProjeto, setEdNomeProjeto] = useState('')
  const [edTipo, setEdTipo] = useState<TipoOrcamento>('Elétrica')
  const [edItens, setEdItens] = useState<ItemOrcamento[]>([])
  const [edDias, setEdDias] = useState(1)
  const [edNumTecnicos, setEdNumTecnicos] = useState(1)
  const [edDesconto, setEdDesconto] = useState(0)
  const [edFormaPagamento, setEdFormaPagamento] = useState('')
  const [edPrazoExecucao, setEdPrazoExecucao] = useState('')
  const [edGarantiaServico, setEdGarantiaServico] = useState('')

  useEffect(() => {
    Promise.all([listarDificuldades(), getConfig()])
      .then(([difs, cfg]) => {
        setDificuldades(difs)
        setConfig(cfg)
      })
      .catch(() => {})
    pesquisar('')
  }, [])

  async function pesquisar(t: string) {
    setCarregando(true)
    try {
      const r = await buscarOrcamentos(t)
      setResultados(r)
    } catch {
      setResultados([])
    } finally {
      setCarregando(false)
    }
  }

  async function abrir(id: string) {
    const completo = await buscarOrcamentoCompleto(id)
    setSelecionado(completo)
    setEditando(false)
    setConfirmandoExclusao(false)
  }

  async function baixar() {
    if (!selecionado) return
    setBaixando(true)
    try {
      await baixarPdfOrcamento(selecionado, dificuldades)
    } finally {
      setBaixando(false)
    }
  }

  async function mudarStatus(status: StatusOrcamento) {
    if (!selecionado?.id) return
    setSalvandoStatus(true)
    try {
      await atualizarStatusOrcamento(selecionado.id, status)
      setSelecionado({ ...selecionado, status })
      setResultados((prev) => prev.map((o) => (o.id === selecionado.id ? { ...o, status } : o)))
    } finally {
      setSalvandoStatus(false)
    }
  }

  async function confirmarExclusao() {
    if (!selecionado?.id) return
    setExcluindo(true)
    try {
      await excluirOrcamento(selecionado.id)
      setSelecionado(null)
      setConfirmandoExclusao(false)
      pesquisar(termo)
    } finally {
      setExcluindo(false)
    }
  }

  function iniciarEdicao() {
    if (!selecionado) return
    setEdResponsavel(selecionado.responsavel)
    setEdClienteNome(selecionado.cliente_nome)
    setEdClienteContato(selecionado.cliente_contato ?? '')
    setEdLocalServico(selecionado.local_servico ?? '')
    setEdNomeProjeto(selecionado.observacoes ?? '')
    setEdTipo(selecionado.tipo)
    setEdItens(selecionado.itens.map((i) => ({ ...i })))
    setEdDias(selecionado.dias)
    setEdNumTecnicos(selecionado.num_tecnicos)
    setEdDesconto(selecionado.desconto)
    setEdFormaPagamento(selecionado.forma_pagamento ?? '')
    setEdPrazoExecucao(selecionado.prazo_execucao ?? '')
    setEdGarantiaServico(selecionado.garantia_servico ?? '')
    setErroEdicao(null)
    setEditando(true)
  }

  const resultadoEdicao = useMemo(() => {
    if (!config) return null
    return calcularOrcamento({
      itens: edItens,
      dificuldades,
      dias: edDias,
      numTecnicos: edNumTecnicos,
      desconto: edDesconto,
      config,
    })
  }, [edItens, dificuldades, edDias, edNumTecnicos, edDesconto, config])

  function atualizarEdItem(idx: number, patch: Partial<ItemOrcamento>) {
    setEdItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function adicionarEdItem() {
    const padrao = dificuldades.find((d) => d.multiplicador === 1) ?? dificuldades[0] ?? null
    const ultimaSecao = edItens[edItens.length - 1]?.secao ?? null
    setEdItens((prev) => [
      ...prev,
      { descricao: '', quantidade: 1, valor_unitario: 0, dificuldade_id: padrao?.id ?? null, ordem: 0, secao: ultimaSecao },
    ])
  }

  function removerEdItem(idx: number) {
    setEdItens((prev) => prev.filter((_, i) => i !== idx))
  }

  async function salvarEdicao() {
    if (!selecionado?.id || !resultadoEdicao) return
    setSalvandoEdicao(true)
    setErroEdicao(null)
    try {
      const patch: Partial<Orcamento> = {
        responsavel: edResponsavel,
        cliente_nome: edClienteNome,
        cliente_contato: edClienteContato,
        local_servico: edLocalServico,
        tipo: edTipo,
        dias: edDias,
        num_tecnicos: edNumTecnicos,
        desconto: edDesconto,
        forma_pagamento: edFormaPagamento,
        prazo_execucao: edPrazoExecucao,
        garantia_servico: edGarantiaServico,
        observacoes: edNomeProjeto,
        subtotal_itens: resultadoEdicao.subtotalItens,
        valor_deslocamento_total: resultadoEdicao.valorDeslocamentoTotal,
        valor_refeicao_total: resultadoEdicao.valorRefeicaoTotal,
        valor_diaria_tecnicos_total: resultadoEdicao.valorDiariaTecnicosTotal,
        valor_nfe: resultadoEdicao.valorNfe,
        total_geral: resultadoEdicao.totalGeral,
      }
      const atualizado = await atualizarOrcamento(selecionado.id, patch, edItens)
      setSelecionado(atualizado)
      setResultados((prev) =>
        prev.map((o) => (o.id === selecionado.id ? { ...o, ...patch } as Orcamento : o))
      )
      setEditando(false)
    } catch (e) {
      console.error(e)
      setErroEdicao('Não foi possível salvar as alterações. Tente novamente.')
    } finally {
      setSalvandoEdicao(false)
    }
  }

  return (
    <div className="flex flex-col">
      {!selecionado && <PageHeader eyebrow="VERIFICAR ORÇAMENTO" />}
      {selecionado && editando && (
        <PageHeader
          eyebrow={`EDITANDO ORÇAMENTO Nº ${String(selecionado.numero).padStart(4, '0')}`}
          onVoltar={() => setEditando(false)}
          labelVoltar="Cancelar edição"
        />
      )}
      {selecionado && !editando && (
        <PageHeader
          eyebrow={`ORÇAMENTO Nº ${String(selecionado.numero).padStart(4, '0')}`}
          onVoltar={() => setSelecionado(null)}
          labelVoltar="Voltar para a busca"
          extra={<StatusBadge status={selecionado.status} />}
        />
      )}

      <main className="flex-1 px-5 sm:px-10 pb-16">
        <div className="max-w-3xl mx-auto">
          {!selecionado ? (
            <>
              <h2 className="font-display font-semibold text-2xl sm:text-3xl mb-8">
                Encontre um orçamento
              </h2>

              <input
                autoFocus
                value={termo}
                onChange={(e) => {
                  setTermo(e.target.value)
                  pesquisar(e.target.value)
                }}
                placeholder="Nome do cliente ou número do orçamento"
                className="w-full border-0 border-b-2 border-ink bg-transparent py-3 text-base sm:text-lg placeholder:text-graphite/40 focus:outline-none mb-8"
              />

              {carregando ? (
                <p className="text-sm text-graphite">Buscando…</p>
              ) : resultados.length === 0 ? (
                <p className="text-sm text-graphite">Nenhum orçamento encontrado.</p>
              ) : (
                <div className="divide-y divide-line border-t border-b border-line">
                  {resultados.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => o.id && abrir(o.id)}
                      className="w-full flex items-center justify-between gap-3 py-4 text-left hover:bg-sand/40 px-2 -mx-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-ink flex flex-wrap items-center gap-2">
                          <span className="truncate">{o.cliente_nome}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <div className="text-xs text-graphite truncate">
                          Nº {String(o.numero).padStart(4, '0')} ·{' '}
                          {new Date(o.created_at ?? '').toLocaleDateString('pt-BR')} · {o.tipo}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular shrink-0">
                        {formatarMoeda(o.total_geral)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : editando ? (
            <>
              {erroEdicao && (
                <div className="mb-6 border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3">
                  {erroEdicao}
                </div>
              )}

              <h2 className="font-display font-semibold text-2xl sm:text-3xl mb-8">{selecionado.cliente_nome}</h2>

              <div className="space-y-6 mb-10">
                <Field label="Seu nome (responsável)" value={edResponsavel} onChange={(e) => setEdResponsavel(e.target.value)} />
                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label="Nome do cliente / empresa" value={edClienteNome} onChange={(e) => setEdClienteNome(e.target.value)} />
                  <Field label="Contato" value={edClienteContato} onChange={(e) => setEdClienteContato(e.target.value)} />
                </div>
                <Field label="Local do serviço" value={edLocalServico} onChange={(e) => setEdLocalServico(e.target.value)} />
                <Field label="Nome do projeto / serviço" value={edNomeProjeto} onChange={(e) => setEdNomeProjeto(e.target.value)} />
                <SelectField label="Tipo de orçamento" value={edTipo} onChange={(v) => setEdTipo(v as TipoOrcamento)}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </SelectField>
              </div>

              <p className="text-[11px] tracking-wide text-graphite mb-4">ITENS</p>
              <div className="space-y-5 mb-4">
                {edItens.map((item, idx) => (
                  <div key={idx} className="border border-line p-5">
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="block text-[11px] tracking-wide text-graphite mb-1.5">Seção (opcional)</span>
                        <input
                          value={item.secao ?? ''}
                          onChange={(e) => atualizarEdItem(idx, { secao: e.target.value })}
                          placeholder="Ex: Quarto, Sala…"
                          className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                        />
                      </div>
                      <Field label="Descrição" value={item.descricao} onChange={(e) => atualizarEdItem(idx, { descricao: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <NumberField label="Quantidade" min={0} value={item.quantidade} onChange={(v) => atualizarEdItem(idx, { quantidade: v })} />
                      <NumberField label="Valor unitário (R$)" min={0} value={item.valor_unitario} onChange={(v) => atualizarEdItem(idx, { valor_unitario: v })} />
                      <SelectField label="Dificuldade" value={item.dificuldade_id ?? ''} onChange={(v) => atualizarEdItem(idx, { dificuldade_id: v })}>
                        {dificuldades.map((d) => (
                          <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                      </SelectField>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-line">
                      <span className="text-xs text-graphite">
                        Total do item:{' '}
                        <span className="text-ink font-semibold tabular">
                          {formatarMoeda(totalItem(item, dificuldades.find((d) => d.id === item.dificuldade_id)))}
                        </span>
                      </span>
                      {edItens.length > 1 && (
                        <Button variant="danger" onClick={() => removerEdItem(idx)}>Remover</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={adicionarEdItem} className="text-sm text-brass hover:text-brass-dark font-medium mb-10 block">
                + Adicionar outro item
              </button>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <NumberField label="Dias necessários" min={1} value={edDias} onChange={setEdDias} />
                <NumberField label="Número de técnicos" min={1} value={edNumTecnicos} onChange={setEdNumTecnicos} />
              </div>
              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <NumberField label="Desconto (R$)" min={0} value={edDesconto} onChange={setEdDesconto} />
                <Field label="Forma de pagamento" value={edFormaPagamento} onChange={(e) => setEdFormaPagamento(e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <Field label="Prazo de execução" value={edPrazoExecucao} onChange={(e) => setEdPrazoExecucao(e.target.value)} />
                <Field label="Garantia do serviço" value={edGarantiaServico} onChange={(e) => setEdGarantiaServico(e.target.value)} />
              </div>

              {resultadoEdicao && (
                <div className="border border-line p-5 mb-8">
                  <div className="flex justify-between font-display font-semibold text-lg">
                    <span>NOVO TOTAL GERAL</span>
                    <span className="tabular">{formatarMoeda(resultadoEdicao.totalGeral)}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
                <Button className="w-full sm:w-auto" onClick={salvarEdicao} disabled={salvandoEdicao}>
                  {salvandoEdicao ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display font-semibold text-2xl sm:text-3xl mb-1">
                {selecionado.cliente_nome}
              </h2>
              <p className="text-sm text-graphite mb-8">
                {selecionado.observacoes || `Serviço de ${selecionado.tipo}`}
              </p>

              <div className="mb-8 max-w-xs">
                <SelectField
                  label="Status do orçamento"
                  value={selecionado.status ?? 'pendente'}
                  onChange={(v) => mudarStatus(v as StatusOrcamento)}
                >
                  {STATUS_OPCOES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </SelectField>
                {salvandoStatus && <p className="text-[11px] text-graphite mt-1">Salvando…</p>}
              </div>

              <div className="border border-line p-5 mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <InfoLinha label="Contato" valor={selecionado.cliente_contato} />
                  <InfoLinha label="Local do serviço" valor={selecionado.local_servico} />
                  <InfoLinha label="Responsável" valor={selecionado.responsavel} />
                  <InfoLinha
                    label="Data"
                    valor={new Date(selecionado.created_at ?? '').toLocaleDateString('pt-BR')}
                  />
                  <InfoLinha label="Dias de execução" valor={String(selecionado.dias)} />
                  <InfoLinha label="Técnicos" valor={String(selecionado.num_tecnicos)} />
                </div>
              </div>

              <div className="mb-8">
                <p className="text-[11px] tracking-wide text-graphite mb-3">ITENS</p>
                <div className="border border-line divide-y divide-line">
                  {selecionado.itens.map((item, idx) => (
                    <div key={idx} className="flex justify-between gap-3 py-3 px-4 text-sm">
                      <span className="min-w-0 truncate">
                        {item.secao && <span className="text-graphite">[{item.secao}] </span>}
                        {item.descricao}
                      </span>
                      <span className="tabular text-graphite shrink-0">× {item.quantidade}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-line p-5 mb-10">
                <div className="flex justify-between font-display font-semibold text-lg">
                  <span>TOTAL GERAL</span>
                  <span className="tabular">{formatarMoeda(selecionado.total_geral)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                <Button className="w-full sm:w-auto" onClick={baixar} disabled={baixando}>
                  {baixando ? 'Gerando PDF…' : 'Baixar PDF novamente'}
                </Button>
                <Button className="w-full sm:w-auto" variant="secondary" onClick={iniciarEdicao}>
                  Editar orçamento
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-line">
                {!confirmandoExclusao ? (
                  <button
                    onClick={() => setConfirmandoExclusao(true)}
                    className="text-sm text-graphite hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    Excluir este orçamento
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 border border-red-300 dark:border-red-900 px-4 py-3">
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Excluir este orçamento? Essa ação não pode ser desfeita.
                    </span>
                    <div className="flex gap-3 sm:ml-auto shrink-0">
                      <button
                        onClick={() => setConfirmandoExclusao(false)}
                        className="text-sm text-graphite hover:text-ink"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmarExclusao}
                        disabled={excluindo}
                        className="text-sm font-semibold text-red-700 dark:text-red-300 hover:underline"
                      >
                        {excluindo ? 'Excluindo…' : 'Sim, excluir'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function InfoLinha({ label, valor }: { label: string; valor?: string }) {
  return (
    <div>
      <div className="text-[11px] text-graphite">{label}</div>
      <div className="text-ink">{valor || '-'}</div>
    </div>
  )
}
