import { useEffect, useMemo, useState } from 'react'
import { listarLancamentos } from '../lib/api'
import { formatarMoeda } from '../lib/calculo'
import { calcularResumo, formatarDataBR, intervaloDoMes, mesAtual, nomeMes } from '../lib/livro-caixa'
import type { LancamentoCaixa } from '../lib/types'

export function Home({
  onNovo,
  onBuscar,
  onCaixa,
}: {
  onNovo: () => void
  onBuscar: () => void
  onCaixa: () => void
}) {
  const { ano, mes } = mesAtual()
  const [lancamentos, setLancamentos] = useState<LancamentoCaixa[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarLancamentos(intervaloDoMes(ano, mes))
      .then((dados) => {
        if (!cancelado) setLancamentos(dados)
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resumo = useMemo(() => calcularResumo(lancamentos), [lancamentos])
  const recentes = lancamentos.slice(0, 5)

  return (
    <main className="px-5 sm:px-10 py-8 sm:py-10">
      <div className="w-full max-w-4xl mx-auto">
        <p className="text-[11px] tracking-[0.15em] text-brass mb-2">
          DESEMPENHO · {nomeMes(mes).toUpperCase()} {ano}
        </p>
        <h1 className="font-display font-semibold text-2xl sm:text-4xl text-ink leading-tight mb-8 sm:mb-10">
          Como a Ampher está indo esse mês
        </h1>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-px bg-line mb-3">
          <CartaoResumo label="Entradas" valor={resumo.totalEntradas} cor="text-green-600 dark:text-green-400" carregando={carregando} />
          <CartaoResumo label="Saídas" valor={resumo.totalSaidas} cor="text-red-600 dark:text-red-400" carregando={carregando} />
          <CartaoResumo
            label="Saldo"
            valor={resumo.saldo}
            cor={resumo.saldo >= 0 ? 'text-ink' : 'text-red-600 dark:text-red-400'}
            carregando={carregando}
          />
        </div>
        <button onClick={onCaixa} className="text-xs text-brass hover:text-brass-dark font-medium mb-10">
          Abrir livro caixa completo →
        </button>

        <div className="grid sm:grid-cols-2 gap-10 mb-10">
          {/* Saídas por categoria */}
          <div>
            <p className="text-[11px] tracking-wide text-graphite mb-3">SAÍDAS POR CATEGORIA</p>
            {carregando ? (
              <p className="text-sm text-graphite">Carregando…</p>
            ) : resumo.porCategoria.length === 0 ? (
              <p className="text-sm text-graphite">Nenhuma saída lançada esse mês ainda.</p>
            ) : (
              <GraficoRosca dados={resumo.porCategoria.slice(0, 6)} />
            )}
          </div>

          {/* Últimos lançamentos */}
          <div>
            <p className="text-[11px] tracking-wide text-graphite mb-3">ÚLTIMOS LANÇAMENTOS</p>
            {carregando ? (
              <p className="text-sm text-graphite">Carregando…</p>
            ) : recentes.length === 0 ? (
              <p className="text-sm text-graphite">Nenhum lançamento esse mês ainda.</p>
            ) : (
              <div className="divide-y divide-line border-t border-b border-line">
                {recentes.map((l) => {
                  const entrada = l.tipo === 'entrada'
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-ink truncate">{l.descricao}</p>
                        <p className="text-xs text-graphite truncate">{formatarDataBR(l.data)}</p>
                      </div>
                      <span
                        className={`text-sm font-medium tabular shrink-0 ${
                          entrada ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {entrada ? '+ ' : '- '}
                        {formatarMoeda(l.valor)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ações rápidas */}
        <p className="text-[11px] tracking-wide text-graphite mb-3">O QUE VOCÊ PRECISA FAZER AGORA?</p>
        <div className="grid sm:grid-cols-3 gap-px bg-line">
          <button
            onClick={onNovo}
            className="bg-paper hover:bg-ink hover:text-paper transition-colors text-left p-5 sm:p-6 group"
          >
            <span className="flex items-center gap-2 font-display font-semibold text-lg mb-1.5">
              <IconeCriarOrcamento className="shrink-0 text-brass group-hover:text-paper transition-colors" />
              Criar orçamento
            </span>
            <span className="block text-xs text-graphite group-hover:text-paper/70">
              Monte um orçamento novo e gere o PDF pra enviar ao cliente.
            </span>
          </button>

          <button
            onClick={onBuscar}
            className="bg-paper hover:bg-ink hover:text-paper transition-colors text-left p-5 sm:p-6 group"
          >
            <span className="flex items-center gap-2 font-display font-semibold text-lg mb-1.5">
              <IconeVerificarOrcamento className="shrink-0 text-brass group-hover:text-paper transition-colors" />
              Verificar orçamento
            </span>
            <span className="block text-xs text-graphite group-hover:text-paper/70">
              Busque um orçamento existente, veja o status, edite ou exclua.
            </span>
          </button>

          <button
            onClick={onCaixa}
            className="bg-paper hover:bg-ink hover:text-paper transition-colors text-left p-5 sm:p-6 group"
          >
            <span className="flex items-center gap-2 font-display font-semibold text-lg mb-1.5">
              <IconeLivroCaixaAtalho className="shrink-0 text-brass group-hover:text-paper transition-colors" />
              Livro caixa
            </span>
            <span className="block text-xs text-graphite group-hover:text-paper/70">
              Lance entradas, saídas e acompanhe o caixa mês a mês.
            </span>
          </button>
        </div>
      </div>
    </main>
  )
}

/**
 * Gráfico de rosca (donut) das saídas por categoria, com legenda embaixo
 * mostrando cor, categoria, valor e percentual — substitui as antigas
 * barras de progresso. Feito com SVG puro (sem lib de gráfico) usando a
 * técnica de stroke-dasharray por segmento de círculo.
 */
const CORES_ROSCA = ['#a9863c', '#6b8f71', '#b5651d', '#5b7c99', '#8a5b8f', '#c9a35f']

function GraficoRosca({ dados }: { dados: { categoria: string; total: number }[] }) {
  const total = dados.reduce((soma, d) => soma + d.total, 0)
  const raio = 60
  const espessura = 24
  const circunferencia = 2 * Math.PI * raio

  // Calcula o comprimento e o deslocamento (offset) de cada fatia antes de
  // renderizar, em vez de acumular numa variável mutável dentro do .map —
  // assim o cálculo fica puro, sem efeito colateral durante a renderização.
  const fatias = dados.reduce<{ categoria: string; comprimento: number; offset: number }[]>((acc, d) => {
    const anterior = acc[acc.length - 1]
    const offset = anterior ? anterior.offset + anterior.comprimento : 0
    const comprimento = (total > 0 ? d.total / total : 0) * circunferencia
    return [...acc, { categoria: d.categoria, comprimento, offset }]
  }, [])

  return (
    <div>
      <svg viewBox="0 0 160 160" className="w-40 h-40 mx-auto">
        <g transform="rotate(-90 80 80)">
          {fatias.map((f, i) => (
            <circle
              key={f.categoria}
              cx="80"
              cy="80"
              r={raio}
              fill="none"
              stroke={CORES_ROSCA[i % CORES_ROSCA.length]}
              strokeWidth={espessura}
              strokeDasharray={`${f.comprimento} ${circunferencia - f.comprimento}`}
              strokeDashoffset={-f.offset}
            />
          ))}
        </g>
        <text x="80" y="76" textAnchor="middle" className="text-ink fill-current font-display font-semibold" style={{ fontSize: 15 }}>
          {formatarMoeda(total)}
        </text>
        <text x="80" y="93" textAnchor="middle" className="text-graphite fill-current" style={{ fontSize: 8, letterSpacing: '0.05em' }}>
          TOTAL DE SAÍDAS
        </text>
      </svg>

      <div className="mt-4 space-y-2">
        {dados.map((d, i) => (
          <div key={d.categoria} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CORES_ROSCA[i % CORES_ROSCA.length] }}
              />
              <span className="text-ink truncate">{d.categoria}</span>
            </span>
            <span className="text-graphite tabular shrink-0">
              {formatarMoeda(d.total)} · {total > 0 ? Math.round((d.total / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CartaoResumo({
  label,
  valor,
  cor,
  carregando,
}: {
  label: string
  valor: number
  cor: string
  carregando: boolean
}) {
  return (
    <div className="bg-paper p-4 sm:p-6">
      <p className="text-[11px] tracking-wide text-graphite mb-1.5">{label}</p>
      <p className={`font-display font-semibold text-xl sm:text-2xl tabular ${cor}`}>
        {carregando ? '—' : formatarMoeda(valor)}
      </p>
    </div>
  )
}

function IconeCriarOrcamento({ className = '' }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M9.5 15h5M12 12.5v5" />
    </svg>
  )
}

function IconeVerificarOrcamento({ className = '' }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function IconeLivroCaixaAtalho({ className = '' }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="1" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M12 12v4M9.5 14h5" />
    </svg>
  )
}
