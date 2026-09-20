import { useState } from 'react'
import { Home } from './screens/Home'
import { NovoOrcamento } from './screens/NovoOrcamento'
import { BuscarOrcamento } from './screens/BuscarOrcamento'
import { Clientes } from './screens/Clientes'
import { Configuracoes } from './screens/Configuracoes'
import { LivroCaixa } from './screens/LivroCaixa'
import { Auth } from './screens/Auth'
import { Sidebar, type Tela } from './components/Sidebar'
import { useDarkMode } from './hooks/useDarkMode'
import { useAuth } from './hooks/useAuth'
import { redefinirSenha } from './lib/auth'
import logoIcon from './assets/logo-icon.png'

function App() {
  const [tela, setTela] = useState<Tela>('home')
  const [menuAberto, setMenuAberto] = useState(false)
  const { escuro, alternar } = useDarkMode()
  const { usuario, entrar, cadastrarConta, sair } = useAuth()

  // Sem login, só a tela de entrar/cadastrar/redefinir senha é acessível.
  if (!usuario) {
    return <Auth onEntrar={entrar} onCadastrar={cadastrarConta} onRedefinirSenha={redefinirSenha} />
  }

  function sairEVoltarHome() {
    sair()
    setTela('home')
  }

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar
        telaAtual={tela}
        onNavegar={setTela}
        escuro={escuro}
        onAlternarTema={alternar}
        aberta={menuAberto}
        onFechar={() => setMenuAberto(false)}
        nomeUsuario={usuario.nome}
        onSair={sairEVoltarHome}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior só no mobile — abre o menu lateral em cima do conteúdo */}
        <div className="sm:hidden grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 pt-safe pb-4 border-b border-line">
          <button
            onClick={() => setMenuAberto(true)}
            className="justify-self-start p-1 -ml-1 text-ink"
            aria-label="Abrir menu"
          >
            <IconeMenu />
          </button>
          <button onClick={() => setTela('home')} className="flex items-center gap-2 justify-self-center">
            <img src={logoIcon} alt="Ampher" className="h-6 w-6 object-contain dark:invert" />
            <span className="font-display font-semibold text-sm tracking-wide">AMPHER</span>
          </button>
          <span aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          {tela === 'home' && (
            <Home
              onNovo={() => setTela('novo')}
              onBuscar={() => setTela('buscar')}
              onCaixa={() => setTela('caixa')}
            />
          )}
          {tela === 'novo' && (
            <NovoOrcamento onVoltar={() => setTela('home')} nomeResponsavel={usuario.nome} />
          )}
          {tela === 'buscar' && <BuscarOrcamento onVoltar={() => setTela('home')} />}
          {tela === 'clientes' && <Clientes onVoltar={() => setTela('home')} />}
          {tela === 'caixa' && <LivroCaixa onVoltar={() => setTela('home')} />}
          {tela === 'config' && <Configuracoes onVoltar={() => setTela('home')} usuarioLogado={usuario} />}
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
