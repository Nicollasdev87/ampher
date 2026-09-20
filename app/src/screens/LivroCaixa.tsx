import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Field, MoneyField, SelectField } from '../components/Field'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { criarLancamento, atualizarLancamento, listarLancamentos, removerLancamento } from '../lib/api'
import { formatarMoeda } from '../lib/calculo'
import { OBSERVACAO_ITEM_MAXIMO, TEXTO_MAXIMO_PADRAO } from '../lib/formatacao'
import {
  calcularResumo,
  categoriasPara,
  dataHojeISO,
  formatarDataBR,
  intervaloDoMes,
  mesAtual,
  nomeMes,
} from '../lib/livro-caixa'
import type { LancamentoCaixa, TipoLancamento } from '../lib/types'

type DadosLancamento = {
  tipo: TipoLancamento
  categoria: string
  descricao: string
  valor: number
  data: string
  observacao: string
}

function novoDados(tipo: TipoLancamento = 'saida'): DadosLancamento {
  return { tipo, categoria: categoriasPara(tipo)[0], descricao: '', valor: 0, data: dataHojeISO(), observacao: '' }
}

export function LivroCaixa({ onVoltar }: { onVoltar: () => void }) {
  const [{ ano, mes }, setMesAno] = useState(mesAtual())
  const [lancamentos, setLancamentos] = useState<LancamentoCaixa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<LancamentoCaixa | null>(null)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setErro(null)
    listarLancamentos(intervaloDoMes(ano, mes))
      .then((dados) => {
        if (!cancelado) setLancamentos(dados)
      })
      .catch((e) => {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Não foi possível carregar o livro caixa.')
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [ano, mes])

  const resumo = useMemo(() => calcularResumo(lancamentos), [lancamentos])

  function mudarMes(delta: number) {
    setMesAno(({ ano, mes }) => {
      const data = new Date(ano, mes - 1 + delta, 1)
      return { ano: data.getFullYear(), mes: data.getMonth() + 1 }
    })
  }

  function abrirNovo() {
    setEditando(null)
    setMostrarModal(true)
  }

  function abrirEdicao(l: LancamentoCaixa) {
    setEditando(l)
    setMostrarModal(true)
  }

  async function salvar(dados: DadosLancamento) {
    const payload = {
      tipo: dados.tipo,
      categoria: dados.categoria,
      descricao: dados.descricao.trim(),
      valor: dados.valor,
      data: dados.data,
      observacao: dados.observacao.trim() || null,
    }
    if (editando) {
      const atualizado = await atualizarLancamento(editando.id, payload)
      setLancamentos((atual) => atual.map((l) => (l.id === atualizado.id ? atualizado : l)))
    } else {
      const criado = await criarLancamento(payload)
      // Só entra na lista se o lançamento criado cair dentro do mês em exibição.
      const { inicio, fim } = intervaloDoMes(ano, mes)
      if (criado.data >= inicio && criado.data <= fim) {
        setLancamentos((atual) =>
          [...atual, criado].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
        )
      }
    }
    setMostrarModal(false)
  }

  async function excluir(id: string) {
    await removerLancamento(id)
    setLancamentos((atual) => atual.filter((l) => l.id !== id))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        eyebrow="LIVRO CAIXA"
        onVoltar={onVoltar}
        extra={
          <Button onClick={abrirNovo} className="shrink-0">
            + Lançamento
          </Button>
        }
      />

      <main className="flex-1 px-5 sm:px-10 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <button onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="p-1.5 text-graphite hover:text-ink">
              <IconeChevronEsquerda />
            </button>
            <h1 className="font-display font-semibold text-xl text-ink w-40 text-center">
              {nomeMes(mes)} {ano}
            </h1>
            <button onClick={() => mudarMes(1)} aria-label="Próximo mês" className="p-1.5 text-graphite hover:text-ink">
              <IconeChevronDireita />
            </button>
          </div>

          {erro && (
            <div className="mb-6 border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3">
              {erro}
            </div>
          )}

          <div className="grid grid-cols-3 gap-px bg-line mb-10">
            <CartaoResumo label="Entradas" valor={resumo.totalEntradas} cor="text-green-600 dark:text-green-400" />
            <CartaoResumo label="Saídas" valor={resumo.totalSaidas} cor="text-red-600 dark:text-red-400" />
            <CartaoResumo
              label="Saldo"
              valor={resumo.saldo}
              cor={resumo.saldo >= 0 ? 'text-ink' : 'text-red-600 dark:text-red-400'}
            />
          </div>

          {resumo.porCategoria.length > 0 && (
            <div className="mb-10">
              <p className="text-[11px] tracking-wide text-graphite mb-3">SAÍDAS POR CATEGORIA</p>
              <div className="space-y-2.5">
                {resumo.porCategoria.map((c) => (
                  <BarraCategoria key={c.categoria} categoria={c.categoria} total={c.total} maximo={resumo.porCategoria[0].total} />
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] tracking-wide text-graphite mb-3">LANÇAMENTOS DO MÊS</p>

          {carregando ? (
            <p className="text-sm text-graphite py-8 text-center">Carregando…</p>
          ) : lancamentos.length === 0 ? (
            <p className="text-sm text-graphite py-8 text-center">Nenhum lançamento neste mês ainda.</p>
          ) : (
            <div className="divide-y divide-line border-t border-b border-line">
              {lancamentos.map((l) => (
                <LinhaLancamento key={l.id} lancamento={l} onEditar={() => abrirEdicao(l)} onExcluir={() => excluir(l.id)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {mostrarModal && (
        <ModalLancamento
          inicial={editando ? paraDados(editando) : novoDados()}
          titulo={editando ? 'Editar lançamento' : 'Novo lançamento'}
          onSalvar={salvar}
          onClose={() => setMostrarModal(false)}
        />
      )}
    </div>
  )
}

function paraDados(l: LancamentoCaixa): DadosLancamento {
  return {
    tipo: l.tipo,
    categoria: l.categoria,
    descricao: l.descricao,
    valor: l.valor,
    data: l.data,
    observacao: l.observacao ?? '',
  }
}

function CartaoResumo({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="bg-paper p-4 sm:p-5">
      <p className="text-[11px] tracking-wide text-graphite mb-1.5">{label}</p>
      <p className={`font-display font-semibold text-lg sm:text-xl tabular ${cor}`}>{formatarMoeda(valor)}</p>
    </div>
  )
}

function BarraCategoria({ categoria, total, maximo }: { categoria: string; total: number; maximo: number }) {
  const largura = maximo > 0 ? Math.max(4, (total / maximo) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-ink">{categoria}</span>
        <span className="text-graphite tabular">{formatarMoeda(total)}</span>
      </div>
      <div className="h-1.5 bg-line">
        <div className="h-full bg-brass" style={{ width: `${largura}%` }} />
      </div>
    </div>
  )
}

function LinhaLancamento({
  lancamento,
  onEditar,
  onExcluir,
}: {
  lancamento: LancamentoCaixa
  onEditar: () => void
  onExcluir: () => void
}) {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const entrada = lancamento.tipo === 'entrada'

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <button onClick={onEditar} className="min-w-0 flex-1 text-left group">
        <p className="text-sm text-ink truncate group-hover:text-brass transition-colors">{lancamento.descricao}</p>
        <p className="text-xs text-graphite truncate">
          {formatarDataBR(lancamento.data)} · {lancamento.categoria}
        </p>
      </button>
      <span className={`text-sm font-medium tabular shrink-0 ${entrada ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {entrada ? '+ ' : '- '}
        {formatarMoeda(lancamento.valor)}
      </span>
      <div className="flex items-center gap-2.5 shrink-0">
        {!confirmandoExclusao ? (
          <button
            onClick={() => setConfirmandoExclusao(true)}
            aria-label="Remover lançamento"
            className="text-xs text-graphite hover:text-red-500"
          >
            <IconeLixeira />
          </button>
        ) : (
          <>
            <button onClick={onExcluir} className="text-xs text-red-600 dark:text-red-400 font-medium">
              Remover
            </button>
            <button onClick={() => setConfirmandoExclusao(false)} className="text-xs text-graphite hover:text-ink">
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ModalLancamento({
  inicial,
  titulo,
  onSalvar,
  onClose,
}: {
  inicial: DadosLancamento
  titulo: string
  onSalvar: (dados: DadosLancamento) => Promise<void>
  onClose: () => void
}) {
  const [dados, setDados] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function mudarTipo(tipo: TipoLancamento) {
    setDados((d) => ({ ...d, tipo, categoria: categoriasPara(tipo)[0] }))
  }

  const podeSalvar = dados.descricao.trim() && dados.valor > 0 && dados.data

  async function confirmar() {
    setErro(null)
    setSalvando(true)
    try {
      await onSalvar(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o lançamento.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal title={titulo} onClose={onClose}>
      <div className="space-y-5">
        {erro && (
          <div className="border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-2 gap-px bg-line">
          <button
            type="button"
            onClick={() => mudarTipo('entrada')}
            className={`py-2.5 text-sm font-medium transition-colors ${
              dados.tipo === 'entrada' ? 'bg-ink text-paper' : 'bg-paper text-graphite hover:text-ink'
            }`}
          >
            Entrada
          </button>
          <button
            type="button"
            onClick={() => mudarTipo('saida')}
            className={`py-2.5 text-sm font-medium transition-colors ${
              dados.tipo === 'saida' ? 'bg-ink text-paper' : 'bg-paper text-graphite hover:text-ink'
            }`}
          >
            Saída
          </button>
        </div>

        <SelectField label="Categoria" value={dados.categoria} onChange={(v) => setDados((d) => ({ ...d, categoria: v }))}>
          {categoriasPara(dados.tipo).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>

        <Field
          label="Descrição"
          value={dados.descricao}
          onChange={(e) => setDados((d) => ({ ...d, descricao: e.target.value }))}
          placeholder={dados.tipo === 'entrada' ? 'Ex: Pagamento orçamento #42' : 'Ex: Furadeira de impacto'}
          maxLength={TEXTO_MAXIMO_PADRAO}
        />

        <div className="grid grid-cols-2 gap-4">
          <MoneyField label="Valor" value={dados.valor} onChange={(v) => setDados((d) => ({ ...d, valor: v }))} />
          <Field
            label="Data"
            type="date"
            value={dados.data}
            onChange={(e) => setDados((d) => ({ ...d, data: e.target.value }))}
          />
        </div>

        <Field
          label="Observação (opcional)"
          value={dados.observacao}
          onChange={(e) => setDados((d) => ({ ...d, observacao: e.target.value }))}
          maxLength={OBSERVACAO_ITEM_MAXIMO}
        />

        <Button onClick={confirmar} disabled={!podeSalvar || salvando} className="w-full justify-center">
          {salvando ? 'Salvando…' : 'Salvar lançamento'}
        </Button>
      </div>
    </Modal>
  )
}

function IconeChevronEsquerda() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconeChevronDireita() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconeLixeira() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  )
}
