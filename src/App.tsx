import { useState } from 'react'
import { Home } from './screens/Home'
import { NovoOrcamento } from './screens/NovoOrcamento'
import { BuscarOrcamento } from './screens/BuscarOrcamento'
import { Configuracoes } from './screens/Configuracoes'
import { Sidebar, type Tela } from './components/Sidebar'
import { useDarkMode } from './hooks/useDarkMode'
import logoIcon from './assets/logo-icon.png'

const LABEL_MOBILE: Record<Tela, string> = {
  home: 'Início',
  novo: 'Criar orçamento',
  buscar: 'Verificar orçamento',
  config: 'Configurações',
}

function App() {
  const [tela, setTela] = useState<Tela>('home')
  const [menuAberto, setMenuAberto] = useState(false)
  const { escuro, alternar } = useDarkMode()

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar
        telaAtual={tela}
        onNavegar={setTela}
        escuro={escuro}
        onAlternarTema={alternar}
        aberta={menuAberto}
        onFechar={() => setMenuAberto(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col sm:ml-0">
        {/* Barra superior só no mobile — abre o menu lateral em cima do conteúdo */}
        <div className="sm:hidden flex items-center justify-between px-5 py-4 border-b border-line">
          <button onClick={() => setMenuAberto(true)} className="p-1 -ml-1 text-ink" aria-label="Abrir menu">
            <IconeMenu />
          </button>
          <button onClick={() => setTela('home')} className="flex items-center gap-2">
            <img src={logoIcon} alt="Ampher" className="h-6 w-6 object-contain dark:invert" />
            <span className="font-display font-semibold text-sm tracking-wide">AMPHER</span>
          </button>
          <span className="text-xs text-graphite w-16 text-right truncate">{LABEL_MOBILE[tela]}</span>
        </div>

        <div className="flex-1 min-w-0">
          {tela === 'home' && (
            <Home
              onNovo={() => setTela('novo')}
              onBuscar={() => setTela('buscar')}
              onConfig={() => setTela('config')}
            />
          )}
          {tela === 'novo' && <NovoOrcamento onVoltar={() => setTela('home')} />}
          {tela === 'buscar' && <BuscarOrcamento onVoltar={() => setTela('home')} />}
          {tela === 'config' && <Configuracoes onVoltar={() => setTela('home')} />}
        </div>
      </div>
    </div>
  )
}

function IconeMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export default App
