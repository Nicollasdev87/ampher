import type { ReactNode } from 'react'

/**
 * Cabeçalho padrão das telas internas (Criar orçamento, Verificar
 * orçamento, Configurações). Antes cada tela tinha seu próprio
 * `<header>` com paddings e tamanhos ligeiramente diferentes — isso
 * unifica o espaçamento e o botão de voltar em um só lugar.
 */
export function PageHeader({
  eyebrow,
  onVoltar,
  labelVoltar = 'Voltar',
  extra,
}: {
  eyebrow: string
  onVoltar?: () => void
  labelVoltar?: string
  extra?: ReactNode
}) {
  return (
    <header className="px-5 sm:px-10 pt-6 sm:pt-8 pb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {onVoltar && (
          <button
            onClick={onVoltar}
            aria-label={labelVoltar}
            className="shrink-0 -ml-1 p-1.5 text-graphite hover:text-ink transition-colors"
          >
            <IconeVoltar />
          </button>
        )}
        <p className="text-[11px] tracking-[0.15em] text-brass truncate">{eyebrow}</p>
      </div>
      {extra}
    </header>
  )
}

function IconeVoltar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
