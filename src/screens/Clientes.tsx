import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { FormularioCliente } from '../components/FormularioCliente'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { atualizarCliente, criarCliente, listarClientes, removerCliente } from '../lib/api'
import { DADOS_CLIENTE_VAZIOS, type DadosCliente } from '../lib/cliente-form'
import type { Cliente } from '../lib/types'

function paraDados(c: Cliente): DadosCliente {
  return {
    nome: c.nome,
    telefones: c.telefones.length > 0 ? c.telefones : [''],
    endereco: c.endereco ?? '',
    latitude: c.latitude,
    longitude: c.longitude,
  }
}

function paraPayload(dados: DadosCliente) {
  return {
    nome: dados.nome.trim(),
    telefones: dados.telefones.map((t) => t.trim()).filter(Boolean),
    endereco: dados.endereco.trim() || null,
    latitude: dados.latitude,
    longitude: dados.longitude,
    observacao: null,
  }
}

export function Clientes({ onVoltar }: { onVoltar: () => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [dadosNovo, setDadosNovo] = useState<DadosCliente>(DADOS_CLIENTE_VAZIOS)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    listarClientes().then((c) => {
      setClientes(c)
      setCarregando(false)
    })
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return clientes
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo))
  }, [clientes, busca])

  function ordenar(lista: Cliente[]) {
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome))
  }

  async function salvarNovo() {
    if (!dadosNovo.nome.trim()) return
    setSalvando(true)
    try {
      const criado = await criarCliente(paraPayload(dadosNovo))
      setClientes((prev) => ordenar([...prev, criado]))
      setDadosNovo(DADOS_CLIENTE_VAZIOS)
      setModalNovo(false)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarEdicao(id: string, dados: DadosCliente) {
    const atualizado = await atualizarCliente(id, paraPayload(dados))
    setClientes((prev) => ordenar(prev.map((c) => (c.id === id ? atualizado : c))))
  }

  async function excluir(id: string) {
    await removerCliente(id)
    setClientes((prev) => prev.filter((c) => c.id !== id))
  }

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-graphite text-sm">
        Carregando…
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="CLIENTES" onVoltar={onVoltar} />

      <main className="flex-1 px-5 sm:px-10 pb-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-semibold text-2xl sm:text-3xl mb-2">Clientes cadastrados</h2>
          <p className="text-sm text-graphite mb-6">
            Cadastre aqui pra poder escolher rapidamente ao criar um orçamento, já com telefones e
            localização preenchidos.
          </p>

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente por nome…"
            className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors mb-6"
          />

          {clientes.length === 0 && (
            <p className="text-sm text-graphite/70 mb-6">Nenhum cliente cadastrado ainda.</p>
          )}
          {clientes.length > 0 && filtrados.length === 0 && (
            <p className="text-sm text-graphite/70 mb-6">Nenhum cliente encontrado para "{busca}".</p>
          )}

          {filtrados.length > 0 && (
            <div className="divide-y divide-line border-t border-b border-line mb-6">
              {filtrados.map((c) => (
                <LinhaCliente
                  key={c.id}
                  cliente={c}
                  onSalvar={(dados) => salvarEdicao(c.id, dados)}
                  onExcluir={() => excluir(c.id)}
                />
              ))}
            </div>
          )}

          {!modalNovo ? (
            <Button
              variant="secondary"
              onClick={() => {
                setDadosNovo(DADOS_CLIENTE_VAZIOS)
                setModalNovo(true)
              }}
            >
              + Adicionar cliente
            </Button>
          ) : (
            <Modal title="Adicionar cliente" onClose={() => setModalNovo(false)}>
              <FormularioCliente dados={dadosNovo} onChange={setDadosNovo} />
              <div className="flex items-center gap-4 mt-6">
                <Button
                  className="w-full sm:w-auto"
                  variant="secondary"
                  onClick={salvarNovo}
                  disabled={salvando || !dadosNovo.nome.trim()}
                >
                  {salvando ? 'Salvando…' : 'Adicionar cliente'}
                </Button>
                <button onClick={() => setModalNovo(false)} className="text-sm text-graphite hover:text-ink">
                  Cancelar
                </button>
              </div>
            </Modal>
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * Linha de cliente: resumo (nome + telefone principal + endereço) e, ao
 * clicar em "Editar", abre um modal com o formulário completo — mesmo
 * padrão usado no catálogo de itens (Configurações).
 */
function LinhaCliente({
  cliente,
  onSalvar,
  onExcluir,
}: {
  cliente: Cliente
  onSalvar: (dados: DadosCliente) => void
  onExcluir: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [dados, setDados] = useState<DadosCliente>(() => paraDados(cliente))

  function abrirEdicao() {
    setDados(paraDados(cliente))
    setEditando(true)
  }

  function salvar() {
    onSalvar(dados)
    setEditando(false)
  }

  const resumo = [cliente.telefones[0], cliente.endereco].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-ink truncate">{cliente.nome}</p>
        {resumo && <p className="text-xs text-graphite truncate">{resumo}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {!confirmandoExclusao ? (
          <>
            <button onClick={abrirEdicao} className="text-xs text-brass font-medium hover:text-brass-dark">
              Editar
            </button>
            <button
              onClick={() => setConfirmandoExclusao(true)}
              className="text-xs text-graphite hover:text-red-500"
            >
              Remover
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-graphite">Remover?</span>
            <button onClick={onExcluir} className="text-xs text-red-600 dark:text-red-400 font-medium">
              Sim
            </button>
            <button
              onClick={() => setConfirmandoExclusao(false)}
              className="text-xs text-graphite hover:text-ink"
            >
              Não
            </button>
          </>
        )}
      </div>

      {editando && (
        <Modal title="Editar cliente" onClose={() => setEditando(false)}>
          <FormularioCliente dados={dados} onChange={setDados} />
          <div className="flex items-center gap-4 mt-6">
            <Button className="w-full sm:w-auto" variant="secondary" onClick={salvar} disabled={!dados.nome.trim()}>
              Salvar
            </Button>
            <button onClick={() => setEditando(false)} className="text-sm text-graphite hover:text-ink">
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
