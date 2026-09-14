import logoIcon from '../assets/logo-icon.png'

export type Tela = 'home' | 'novo' | 'buscar' | 'config'

const ITENS_NAV: { tela: Tela; numero: string; label: string }[] = [
  { tela: 'home', numero: '00', label: 'Início' },
  { tela: 'novo', numero: '01', label: 'Criar orçamento' },
  { tela: 'buscar', numero: '02', label: 'Verificar orçamento' },
]

export function Sidebar({
  telaAtual,
  onNavegar,
  escuro,
  onAlternarTema,
  aberta = true,
  onFechar,
}: {
  telaAtual: Tela
  onNavegar: (tela: Tela) => void
  escuro: boolean
  onAlternarTema: () => void
  /** No mobile a sidebar é um drawer que abre/fecha; no desktop fica sempre visível. */
  aberta?: boolean
  onFechar?: () => void
}) {
  function navegarEFechar(tela: Tela) {
    onNavegar(tela)
    onFechar?.()
  }

  return (
    <>
      {/* Fundo escurecido atrás do drawer, só no mobile e só quando aberto */}
      {aberta && (
        <div
          onClick={onFechar}
          className="sm:hidden fixed inset-0 bg-ink/40 z-40"
          aria-hidden="true"
        />
      )}

      <aside
        className={`flex flex-col w-60 shrink-0 border-r border-line bg-paper px-5 py-6 h-screen fixed sm:sticky top-0 left-0 z-50 transition-transform duration-200 ${
          aberta ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => navegarEFechar('home')}
            className="flex items-center gap-2.5 text-left"
          >
            <img src={logoIcon} alt="Ampher" className="h-7 w-7 object-contain dark:invert" />
            <div className="leading-none">
              <div className="font-display font-semibold text-base tracking-wide text-ink">
                AMPHER
              </div>
              <div className="text-[8px] tracking-[0.15em] text-graphite">
                ENGENHARIA & AUTOMAÇÃO
              </div>
            </div>
          </button>
          <button onClick={onFechar} className="sm:hidden p-1 text-graphite hover:text-ink">
            <IconeFechar />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {ITENS_NAV.map((item) => {
            const ativo = telaAtual === item.tela
            return (
              <button
                key={item.tela}
                onClick={() => navegarEFechar(item.tela)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  ativo
                    ? 'bg-ink text-paper font-medium'
                    : 'text-graphite hover:bg-sand/50 hover:text-ink'
                }`}
              >
                <span
                  className={`text-[10px] tracking-wide ${ativo ? 'text-paper/60' : 'text-brass'}`}
                >
                  {item.numero}
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="space-y-1 pt-4 border-t border-line">
          <button
            onClick={() => navegarEFechar('config')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
              telaAtual === 'config'
                ? 'bg-ink text-paper font-medium'
                : 'text-graphite hover:bg-sand/50 hover:text-ink'
            }`}
          >
            <IconeConfig />
            Configurações
          </button>

          <button
            onClick={onAlternarTema}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-graphite hover:bg-sand/50 hover:text-ink transition-colors"
          >
            <span className="flex items-center gap-3">
              {escuro ? <IconeLua /> : <IconeSol />}
              {escuro ? 'Modo escuro' : 'Modo claro'}
            </span>
            <span
              className={`relative inline-flex h-4 w-7 items-center transition-colors ${
                escuro ? 'bg-brass' : 'bg-line'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform bg-paper transition-transform ${
                  escuro ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}

function IconeFechar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function IconeConfig() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconeSol() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function IconeLua() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
