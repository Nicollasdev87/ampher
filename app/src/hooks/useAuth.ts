import { useCallback, useState } from 'react'
import { autenticar, cadastrar, lerSessaoSalva, limparSessao, salvarSessao } from '../lib/auth'
import type { UsuarioSessao } from '../lib/types'

/**
 * Sessão de login do app. Persiste em localStorage (sem expiração —
 * é um único dispositivo/equipe, não precisa de token com validade).
 */
export function useAuth() {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(() => lerSessaoSalva())

  const entrar = useCallback(async (login: string, senha: string) => {
    const sessao = await autenticar(login, senha)
    salvarSessao(sessao)
    setUsuario(sessao)
    return sessao
  }, [])

  const cadastrarConta = useCallback(
    async (dados: { nome: string; usuario: string; senha: string; confirmarSenha: string; codigo: string }) => {
      const sessao = await cadastrar(dados)
      salvarSessao(sessao)
      setUsuario(sessao)
      return sessao
    },
    []
  )

  const sair = useCallback(() => {
    limparSessao()
    setUsuario(null)
  }, [])

  return { usuario, entrar, cadastrarConta, sair }
}
