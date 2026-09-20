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
              <div className="space-y-2.5">
                {resumo.porCategoria.slice(0, 6).map((c) => (
                  <BarraCategoria
                    key={c.categoria}
                    categoria={c.categoria}
                    total={c.total}
                    maximo={resumo.porCategoria[0].total}
                  />
                ))}
              </div>
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
            <span className="block font-display font-semibold text-lg mb-1.5">Criar orçamento</span>
            <span className="block text-xs text-graphite group-hover:text-paper/70">
              Monte um orçamento novo e gere o PDF pra enviar ao cliente.
            </span>
          </button>

          <button
            onClick={onBuscar}
            className="bg-paper hover:bg-ink hover:text-paper transition-colors text-left p-5 sm:p-6 group"
          >
            <span className="block font-display font-semibold text-lg mb-1.5">Verificar orçamento</span>
            <span className="block text-xs text-graphite group-hover:text-paper/70">
              Busque um orçamento existente, veja o status, edite ou exclua.
            </span>
          </button>

          <button
            onClick={onCaixa}
            className="bg-paper hover:bg-ink hover:text-paper transition-colors text-left p-5 sm:p-6 group"
          >
            <span className="block font-display font-semibold text-lg mb-1.5">Livro caixa</span>
            <span className="block text-xs text-graphite group-hover:text-paper/70">
              Lance entradas, saídas e acompanhe o caixa mês a mês.
            </span>
          </button>
        </div>
      </div>
    </main>
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
