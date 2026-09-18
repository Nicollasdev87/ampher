import { useState } from 'react'
import { Button } from '../components/Button'
import { Field, PasswordField } from '../components/Field'
import { regrasSenha } from '../lib/senha'
import { TEXTO_MAXIMO_PADRAO } from '../lib/formatacao'
import logoIcon from '../assets/logo-icon.png'
import type { UsuarioSessao } from '../lib/types'

type Modo = 'login' | 'cadastro' | 'esqueci'

interface Props {
  onEntrar: (usuario: string, senha: string) => Promise<UsuarioSessao>
  onCadastrar: (dados: {
    nome: string
    usuario: string
    senha: string
    confirmarSenha: string
    codigo: string
  }) => Promise<UsuarioSessao>
  onRedefinirSenha: (dados: {
    usuario: string
    codigo: string
    novaSenha: string
    confirmarNovaSenha: string
  }) => Promise<void>
}

export function Auth({ onEntrar, onCadastrar, onRedefinirSenha }: Props) {
  const [modo, setModo] = useState<Modo>('login')

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-paper">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src={logoIcon} alt="Ampher" className="h-10 w-10 object-contain dark:invert mb-3" />
          <div className="text-center leading-none">
            <div className="font-display font-semibold text-lg tracking-wide text-ink">AMPHER</div>
            <div className="text-[8px] tracking-[0.15em] text-graphite mt-1">ENGENHARIA &amp; AUTOMAÇÃO</div>
          </div>
        </div>

        {modo === 'login' && (
          <TelaLogin
            onEntrar={onEntrar}
            onIrCadastro={() => setModo('cadastro')}
            onIrEsqueci={() => setModo('esqueci')}
          />
        )}
        {modo === 'cadastro' && <TelaCadastro onCadastrar={onCadastrar} onIrLogin={() => setModo('login')} />}
        {modo === 'esqueci' && (
          <TelaEsqueciSenha onRedefinirSenha={onRedefinirSenha} onIrLogin={() => setModo('login')} />
        )}
      </div>
    </div>
  )
}

function CaixaErro({ erro }: { erro: string | null }) {
  if (!erro) return null
  return (
    <div className="mb-5 border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3">
      {erro}
    </div>
  )
}

function TelaLogin({
  onEntrar,
  onIrCadastro,
  onIrEsqueci,
}: {
  onEntrar: (usuario: string, senha: string) => Promise<UsuarioSessao>
  onIrCadastro: () => void
  onIrEsqueci: () => void
}) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar() {
    setErro(null)
    setEnviando(true)
    try {
      await onEntrar(usuario, senha)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <h1 className="font-display font-semibold text-2xl text-ink mb-6 text-center">Entrar</h1>
      <CaixaErro erro={erro} />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          entrar()
        }}
      >
        <Field
          label="Usuário"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          maxLength={40}
        />
        <PasswordField label="Senha" value={senha} onChange={setSenha} autoComplete="current-password" />

        <button
          type="button"
          onClick={onIrEsqueci}
          className="block text-xs text-brass hover:text-brass-dark"
        >
          Esqueci minha senha
        </button>

        <Button type="submit" className="w-full justify-center" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="text-center text-sm text-graphite mt-8">
        Não tem conta?{' '}
        <button onClick={onIrCadastro} className="text-brass hover:text-brass-dark font-medium">
          Cadastre-se
        </button>
      </p>
    </section>
  )
}

function ChecklistSenha({ senha }: { senha: string }) {
  if (!senha) return null
  return (
    <ul className="mt-1.5 space-y-0.5">
      {regrasSenha(senha).map((r) => (
        <li
          key={r.label}
          className={`text-[11px] flex items-center gap-1.5 ${r.ok ? 'text-green-600 dark:text-green-400' : 'text-graphite/70'}`}
        >
          <span>{r.ok ? '✓' : '·'}</span>
          {r.label}
        </li>
      ))}
    </ul>
  )
}

function TelaCadastro({
  onCadastrar,
  onIrLogin,
}: {
  onCadastrar: (dados: {
    nome: string
    usuario: string
    senha: string
    confirmarSenha: string
    codigo: string
  }) => Promise<UsuarioSessao>
  onIrLogin: () => void
}) {
  const [nome, setNome] = useState('')
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function cadastrar() {
    setErro(null)
    setEnviando(true)
    try {
      await onCadastrar({ nome, usuario, senha, confirmarSenha, codigo })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a conta.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <h1 className="font-display font-semibold text-2xl text-ink mb-6 text-center">Criar conta</h1>
      <CaixaErro erro={erro} />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          cadastrar()
        }}
      >
        <Field
          label="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Nicollas V."
          maxLength={TEXTO_MAXIMO_PADRAO}
          autoComplete="name"
        />
        <Field
          label="Usuário (pra fazer login)"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="Ex: nicollas"
          maxLength={40}
          autoComplete="username"
          hint="Só letras, números, ponto, hífen ou underline."
        />
        <div>
          <PasswordField label="Senha" value={senha} onChange={setSenha} autoComplete="new-password" />
          <ChecklistSenha senha={senha} />
        </div>
        <PasswordField
          label="Confirmar senha"
          value={confirmarSenha}
          onChange={setConfirmarSenha}
          autoComplete="new-password"
        />
        <PasswordField
          label="Código de acesso"
          value={codigo}
          onChange={setCodigo}
          hint="Código fornecido pela Ampher para permitir novos cadastros."
        />

        <Button type="submit" className="w-full justify-center" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>

      <p className="text-center text-sm text-graphite mt-8">
        Já tem conta?{' '}
        <button onClick={onIrLogin} className="text-brass hover:text-brass-dark font-medium">
          Entrar
        </button>
      </p>
    </section>
  )
}

function TelaEsqueciSenha({
  onRedefinirSenha,
  onIrLogin,
}: {
  onRedefinirSenha: (dados: {
    usuario: string
    codigo: string
    novaSenha: string
    confirmarNovaSenha: string
  }) => Promise<void>
  onIrLogin: () => void
}) {
  const [usuario, setUsuario] = useState('')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function redefinir() {
    setErro(null)
    setEnviando(true)
    try {
      await onRedefinirSenha({ usuario, codigo, novaSenha, confirmarNovaSenha })
      setSucesso(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível redefinir a senha.')
    } finally {
      setEnviando(false)
    }
  }

  if (sucesso) {
    return (
      <section className="text-center">
        <h1 className="font-display font-semibold text-2xl text-ink mb-3">Senha redefinida</h1>
        <p className="text-sm text-graphite mb-8">Já dá pra entrar com a sua nova senha.</p>
        <Button className="w-full justify-center" onClick={onIrLogin}>
          Ir para o login
        </Button>
      </section>
    )
  }

  return (
    <section>
      <h1 className="font-display font-semibold text-2xl text-ink mb-2 text-center">Redefinir senha</h1>
      <p className="text-sm text-graphite text-center mb-6">
        Informe seu usuário, o código de acesso e a nova senha.
      </p>
      <CaixaErro erro={erro} />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          redefinir()
        }}
      >
        <Field
          label="Usuário"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          maxLength={40}
        />
        <PasswordField label="Código de acesso" value={codigo} onChange={setCodigo} />
        <div>
          <PasswordField label="Nova senha" value={novaSenha} onChange={setNovaSenha} autoComplete="new-password" />
          <ChecklistSenha senha={novaSenha} />
        </div>
        <PasswordField
          label="Confirmar nova senha"
          value={confirmarNovaSenha}
          onChange={setConfirmarNovaSenha}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full justify-center" disabled={enviando}>
          {enviando ? 'Redefinindo…' : 'Redefinir senha'}
        </Button>
      </form>

      <p className="text-center text-sm text-graphite mt-8">
        <button onClick={onIrLogin} className="text-brass hover:text-brass-dark font-medium">
          Voltar ao login
        </button>
      </p>
    </section>
  )
}
