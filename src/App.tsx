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
  const { escuro, alternar } = useDarkMode()

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar telaAtual={tela} onNavegar={setTela} escuro={escuro} onAlternarTema={alternar} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior só no mobile — a navegação principal mora na sidebar */}
        <div className="sm:hidden flex items-center justify-between px-5 py-4 border-b border-line">
          <button onClick={() => setTela('home')} className="flex items-center gap-2">
            <img src={logoIcon} alt="Ampher" className="h-6 w-6 object-contain dark:invert" />
            <span className="font-display font-semibold text-sm tracking-wide">AMPHER</span>
          </button>
          <span className="text-xs text-graphite">{LABEL_MOBILE[tela]}</span>
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

        {/* Navegação inferior só no mobile */}
        <nav className="sm:hidden grid grid-cols-4 border-t border-line">
          {(
            [
              ['home', 'Início'],
              ['novo', 'Novo'],
              ['buscar', 'Buscar'],
              ['config', 'Ajustes'],
            ] as [Tela, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTela(t)}
              className={`py-3 text-[11px] font-medium transition-colors ${
                tela === t ? 'text-ink bg-sand/50' : 'text-graphite'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default App
