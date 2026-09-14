import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { NumberField } from '../components/Field'
import type { Config, Dificuldade } from '../lib/types'
import {
  atualizarConfig,
  atualizarDificuldade,
  criarDificuldade,
  getConfig,
  listarDificuldades,
  removerDificuldade,
} from '../lib/api'

export function Configuracoes({ onVoltar: _onVoltar }: { onVoltar: () => void }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [dificuldades, setDificuldades] = useState<Dificuldade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoMultiplicador, setNovoMultiplicador] = useState(1)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      const [cfg, difs] = await Promise.all([getConfig(), listarDificuldades()])
      setConfig(cfg)
      setDificuldades(difs)
      setCarregando(false)
    }
    carregar()
  }, [])

  async function salvarConfig() {
    if (!config) return
    setSalvandoConfig(true)
    try {
      const atualizado = await atualizarConfig(config)
      setConfig(atualizado)
      setMensagem('Valores salvos.')
      setTimeout(() => setMensagem(null), 2000)
    } finally {
      setSalvandoConfig(false)
    }
  }

  async function adicionarDificuldade() {
    if (!novoNome.trim()) return
    const criada = await criarDificuldade(novoNome, novoMultiplicador)
    setDificuldades((prev) => [...prev, criada].sort((a, b) => a.multiplicador - b.multiplicador))
    setNovoNome('')
    setNovoMultiplicador(1)
  }

  async function editarDificuldade(id: string, nome: string, multiplicador: number) {
    const atualizada = await atualizarDificuldade(id, nome, multiplicador)
    setDificuldades((prev) => prev.map((d) => (d.id === id ? atualizada : d)))
  }

  async function excluirDificuldade(id: string) {
    await removerDificuldade(id)
    setDificuldades((prev) => prev.filter((d) => d.id !== id))
  }

  if (carregando || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-graphite text-sm">
        Carregando…
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-6 sm:px-10">
        <p className="text-[11px] tracking-[0.15em] text-brass">CONFIGURAÇÕES</p>
      </header>

      <main className="flex-1 px-6 sm:px-10 pb-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-semibold text-3xl mb-10">
            Valores e níveis de dificuldade
          </h2>

          <section className="mb-14">
            <p className="text-[11px] tracking-wide text-graphite mb-4">
              VALORES PADRÃO (usados em todo orçamento novo)
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <NumberField
                label="Deslocamento por dia (R$)"
                value={config.valor_deslocamento}
                onChange={(v) => setConfig({ ...config, valor_deslocamento: v })}
              />
              <NumberField
                label="Refeição por técnico/dia (R$)"
                value={config.valor_refeicao}
                onChange={(v) => setConfig({ ...config, valor_refeicao: v })}
              />
              <NumberField
                label="Diária por técnico (R$)"
                value={config.valor_diaria_tecnico}
                onChange={(v) => setConfig({ ...config, valor_diaria_tecnico: v })}
              />
              <NumberField
                label="NFe embutida (%)"
                value={config.percentual_nfe}
                onChange={(v) => setConfig({ ...config, percentual_nfe: v })}
              />
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={salvarConfig} disabled={salvandoConfig}>
                {salvandoConfig ? 'Salvando…' : 'Salvar valores'}
              </Button>
              {mensagem && <span className="text-sm text-brass">{mensagem}</span>}
            </div>
          </section>

          <section>
            <p className="text-[11px] tracking-wide text-graphite mb-4">
              NÍVEIS DE DIFICULDADE (multiplicador aplicado ao valor unitário — não aparece no PDF)
            </p>

            <div className="divide-y divide-line border-t border-b border-line mb-6">
              {dificuldades.map((d) => (
                <LinhaDificuldade
                  key={d.id}
                  dificuldade={d}
                  onSalvar={(nome, mult) => editarDificuldade(d.id, nome, mult)}
                  onExcluir={() => excluirDificuldade(d.id)}
                />
              ))}
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <span className="block text-[11px] tracking-wide text-graphite mb-1.5">
                  Novo nível
                </span>
                <input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Alta complexidade"
                  className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                />
              </div>
              <div className="w-32">
                <NumberField label="Multiplicador" min={1} value={novoMultiplicador} onChange={setNovoMultiplicador} />
              </div>
              <Button variant="secondary" onClick={adicionarDificuldade}>
                Adicionar
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function LinhaDificuldade({
  dificuldade,
  onSalvar,
  onExcluir,
}: {
  dificuldade: Dificuldade
  onSalvar: (nome: string, mult: number) => void
  onExcluir: () => void
}) {
  const [nome, setNome] = useState(dificuldade.nome)
  const [mult, setMult] = useState(dificuldade.multiplicador)
  const alterado = nome !== dificuldade.nome || mult !== dificuldade.multiplicador

  return (
    <div className="flex items-center gap-4 py-3">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
      />
      <input
        type="text"
        inputMode="decimal"
        value={mult}
        onChange={(e) => {
          const limpo = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')
          const num = parseFloat(limpo)
          setMult(Number.isNaN(num) ? 0 : num)
        }}
        className="w-20 border-0 bg-transparent text-sm tabular focus:outline-none text-right"
      />
      <span className="text-xs text-graphite w-6">×</span>
      {alterado && (
        <button
          onClick={() => onSalvar(nome, mult)}
          className="text-xs text-brass font-medium hover:text-brass-dark"
        >
          Salvar
        </button>
      )}
      <button onClick={onExcluir} className="text-xs text-graphite hover:text-red-500">
        Remover
      </button>
    </div>
  )
}
