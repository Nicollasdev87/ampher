import bcrypt from 'bcryptjs'
import { atualizarSenhaUsuario, buscarUsuarioPorLogin, criarUsuario } from './api'
import { validarSenha } from './senha'
import type { UsuarioSessao } from './types'

/**
 * Código de acesso exigido para criar uma conta nova. Só quem tem esse
 * código consegue se cadastrar — sem ele, o formulário de cadastro nem
 * chega a chamar o banco.
 */
export const CODIGO_ACESSO = '182010'

const CHAVE_SESSAO = 'ampher:sessao'
const CUSTO_HASH = 10

function normalizarUsuario(usuario: string): string {
  return usuario.trim()
}

function validarFormatoUsuario(usuario: string): string | null {
  const limpo = usuario.trim()
  if (limpo.length < 3) return 'O usuário deve ter ao menos 3 caracteres.'
  if (limpo.length > 40) return 'O usuário deve ter no máximo 40 caracteres.'
  if (!/^[a-zA-Z0-9._-]+$/.test(limpo)) {
    return 'O usuário deve conter só letras, números, ponto, hífen ou underline (sem espaços ou acentos).'
  }
  return null
}

function paraSessao(usuario: { id: string; nome: string; usuario: string }): UsuarioSessao {
  return { id: usuario.id, nome: usuario.nome, usuario: usuario.usuario }
}

// ---------- Sessão (persistida no navegador) ----------

export function lerSessaoSalva(): UsuarioSessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO)
    if (!bruto) return null
    return JSON.parse(bruto) as UsuarioSessao
  } catch {
    return null
  }
}

export function salvarSessao(sessao: UsuarioSessao): void {
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
}

export function limparSessao(): void {
  localStorage.removeItem(CHAVE_SESSAO)
}

// ---------- Cadastro ----------

export async function cadastrar(dados: {
  nome: string
  usuario: string
  senha: string
  confirmarSenha: string
  codigo: string
}): Promise<UsuarioSessao> {
  const nome = dados.nome.trim()
  const usuario = normalizarUsuario(dados.usuario)

  if (dados.codigo.trim() !== CODIGO_ACESSO) {
    throw new Error('Código de acesso inválido.')
  }
  if (!nome) {
    throw new Error('Informe seu nome.')
  }
  const erroUsuario = validarFormatoUsuario(usuario)
  if (erroUsuario) throw new Error(erroUsuario)

  const erroSenha = validarSenha(dados.senha)
  if (erroSenha) throw new Error(erroSenha)
  if (dados.senha !== dados.confirmarSenha) {
    throw new Error('As senhas não coincidem.')
  }

  const existente = await buscarUsuarioPorLogin(usuario)
  if (existente) {
    throw new Error('Já existe uma conta com esse usuário.')
  }

  const senha_hash = await bcrypt.hash(dados.senha, CUSTO_HASH)
  const criado = await criarUsuario({ nome, usuario, senha_hash })
  return paraSessao(criado)
}

// ---------- Login ----------

export async function autenticar(usuario: string, senha: string): Promise<UsuarioSessao> {
  if (!usuario.trim() || !senha) {
    throw new Error('Preencha usuário e senha.')
  }
  const encontrado = await buscarUsuarioPorLogin(normalizarUsuario(usuario))
  if (!encontrado) {
    throw new Error('Usuário ou senha incorretos.')
  }
  const confere = await bcrypt.compare(senha, encontrado.senha_hash)
  if (!confere) {
    throw new Error('Usuário ou senha incorretos.')
  }
  return paraSessao(encontrado)
}

// ---------- Redefinir senha (esqueci minha senha) ----------
// Sem servidor de e-mail próprio, a verificação de identidade é feita
// pelo mesmo código de acesso usado no cadastro.

export async function redefinirSenha(dados: {
  usuario: string
  codigo: string
  novaSenha: string
  confirmarNovaSenha: string
}): Promise<void> {
  if (dados.codigo.trim() !== CODIGO_ACESSO) {
    throw new Error('Código de acesso inválido.')
  }
  const encontrado = await buscarUsuarioPorLogin(normalizarUsuario(dados.usuario))
  if (!encontrado) {
    throw new Error('Não existe conta com esse usuário.')
  }
  const erroSenha = validarSenha(dados.novaSenha)
  if (erroSenha) throw new Error(erroSenha)
  if (dados.novaSenha !== dados.confirmarNovaSenha) {
    throw new Error('As senhas não coincidem.')
  }

  const senha_hash = await bcrypt.hash(dados.novaSenha, CUSTO_HASH)
  await atualizarSenhaUsuario(encontrado.id, senha_hash)
}

// ---------- Trocar senha (já logado, em Configurações) ----------

export async function trocarSenha(dados: {
  usuario: string
  senhaAtual: string
  novaSenha: string
  confirmarNovaSenha: string
}): Promise<void> {
  const encontrado = await buscarUsuarioPorLogin(normalizarUsuario(dados.usuario))
  if (!encontrado) {
    throw new Error('Usuário não encontrado.')
  }
  const confere = await bcrypt.compare(dados.senhaAtual, encontrado.senha_hash)
  if (!confere) {
    throw new Error('Senha atual incorreta.')
  }
  const erroSenha = validarSenha(dados.novaSenha)
  if (erroSenha) throw new Error(erroSenha)
  if (dados.novaSenha !== dados.confirmarNovaSenha) {
    throw new Error('As senhas não coincidem.')
  }

  const senha_hash = await bcrypt.hash(dados.novaSenha, CUSTO_HASH)
  await atualizarSenhaUsuario(encontrado.id, senha_hash)
}
