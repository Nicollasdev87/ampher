import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { MoneyField, NumberField } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { TEXTO_MAXIMO_PADRAO, VALOR_MAXIMO_REAIS } from '../lib/formatacao'
import type { Config, Dificuldade, ItemCatalogo } from '../lib/types'
import {
  atualizarConfig,
  atualizarDificuldade,
  atualizarItemCatalogo,
  criarDificuldade,
  criarItemCatalogo,
  getConfig,
  listarDificuldades,
  listarItensCatalogo,
  removerDificuldade,
  removerItemCatalogo,
} from '../lib/api'

export function Configuracoes({ onVoltar }: { onVoltar: () => void }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [dificuldades, setDificuldades] = useState<Dificuldade[]>([])
  const [itensCatalogo, setItensCatalogo] = useState<ItemCatalogo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoMultiplicador, setNovoMultiplicador] = useState(1)
  const [mensagem, setMensagem] = useState<string | null>(null)

  // ---- Novo item de catálogo ----
  const [novoItemNome, setNovoItemNome] = useState('')
  const [novoItemCategoria, setNovoItemCategoria] = useState('')
  const [novoItemValor, setNovoItemValor] = useState(0)

  useEffect(() => {
    async function carregar() {
      const [cfg, difs, catalogo] = await Promise.all([getConfig(), listarDificuldades(), listarItensCatalogo()])
      setConfig(cfg)
      setDificuldades(difs)
      setItensCatalogo(catalogo)
      setCarregando(false)
    }
    carregar()
  }, [])

  const categoriasExistentes = useMemo(
    () => Array.from(new Set(itensCatalogo.map((i) => i.categoria))),
    [itensCatalogo]
  )

  const catalogoPorCategoria = useMemo(() => {
    const mapa = new Map<string, ItemCatalogo[]>()
    for (const item of itensCatalogo) {
      if (!mapa.has(item.categoria)) mapa.set(item.categoria, [])
      mapa.get(item.categoria)!.push(item)
    }
    return mapa
  }, [itensCatalogo])

  async function adicionarItemCatalogo() {
    if (!novoItemNome.trim() || !novoItemCategoria.trim()) return
    const criado = await criarItemCatalogo(novoItemCategoria.trim(), novoItemNome.trim(), novoItemValor)
    setItensCatalogo((prev) =>
      [...prev, criado].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))
    )
    setNovoItemNome('')
    setNovoItemValor(0)
  }

  async function editarItemCatalogo(id: string, categoria: string, nome: string, valor_unitario: number) {
    const atualizado = await atualizarItemCatalogo(id, { categoria, nome, valor_unitario })
    setItensCatalogo((prev) => prev.map((i) => (i.id === id ? atualizado : i)))
  }

  async function excluirItemCatalogo(id: string) {
    await removerItemCatalogo(id)
    setItensCatalogo((prev) => prev.filter((i) => i.id !== id))
  }

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
      <div className="min-h-[60vh] flex items-center justify-center text-graphite text-sm">
        Carregando…
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="CONFIGURAÇÕES" onVoltar={onVoltar} />

      <main className="flex-1 px-5 sm:px-10 pb-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-semibold text-2xl sm:text-3xl mb-10">
            Valores e níveis de dificuldade
          </h2>

          <section className="mb-14">
            <p className="text-[11px] tracking-wide text-graphite mb-4">
              VALORES PADRÃO (usados em todo orçamento novo)
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <MoneyField
                label="Deslocamento por dia (R$)"
                max={VALOR_MAXIMO_REAIS}
                value={config.valor_deslocamento}
                onChange={(v) => setConfig({ ...config, valor_deslocamento: v })}
              />
              <MoneyField
                label="Refeição por técnico/dia (R$)"
                max={VALOR_MAXIMO_REAIS}
                value={config.valor_refeicao}
                onChange={(v) => setConfig({ ...config, valor_refeicao: v })}
              />
              <MoneyField
                label="Diária por técnico (R$)"
                max={VALOR_MAXIMO_REAIS}
                value={config.valor_diaria_tecnico}
                onChange={(v) => setConfig({ ...config, valor_diaria_tecnico: v })}
              />
              <NumberField
                label="NFe embutida (%)"
                max={100}
                value={config.percentual_nfe}
                onChange={(v) => setConfig({ ...config, percentual_nfe: v })}
              />
            </div>
            <div className="flex items-center gap-4">
              <Button className="w-full sm:w-auto" onClick={salvarConfig} disabled={salvandoConfig}>
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

            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <span className="block text-[11px] tracking-wide text-graphite mb-1.5">
                  Novo nível
                </span>
                <input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Alta complexidade"
                  maxLength={TEXTO_MAXIMO_PADRAO}
                  className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                />
              </div>
              <div className="sm:w-32">
                <NumberField label="Multiplicador" min={1} value={novoMultiplicador} onChange={setNovoMultiplicador} />
              </div>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={adicionarDificuldade}>
                Adicionar
              </Button>
            </div>
          </section>

          <section className="mt-14">
            <p className="text-[11px] tracking-wide text-graphite mb-2">
              ITENS PREDEFINIDOS (CATÁLOGO)
            </p>
            <p className="text-sm text-graphite mb-4">
              Aparecem no select de "item predefinido" ao criar um orçamento, agrupados por
              categoria. Escolher um deles já preenche a descrição e o valor unitário do item.
            </p>

            <datalist id="categorias-existentes">
              {categoriasExistentes.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            {Array.from(catalogoPorCategoria.entries()).map(([categoria, itensDaCategoria]) => (
              <div key={categoria} className="mb-6">
                <p className="text-[11px] tracking-wide text-brass mb-2 uppercase">{categoria}</p>
                <div className="divide-y divide-line border-t border-b border-line">
                  {itensDaCategoria.map((item) => (
                    <LinhaItemCatalogo
                      key={item.id}
                      item={item}
                      onSalvar={(categoria, nome, valor) => editarItemCatalogo(item.id, categoria, nome, valor)}
                      onExcluir={() => excluirItemCatalogo(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-2">
              <div className="flex-1">
                <span className="block text-[11px] tracking-wide text-graphite mb-1.5">
                  Nome do item
                </span>
                <input
                  value={novoItemNome}
                  onChange={(e) => setNovoItemNome(e.target.value)}
                  placeholder="Ex: Instalação de disjuntor monofásico"
                  maxLength={TEXTO_MAXIMO_PADRAO}
                  className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                />
              </div>
              <div className="sm:w-48">
                <span className="block text-[11px] tracking-wide text-graphite mb-1.5">
                  Categoria
                </span>
                <input
                  list="categorias-existentes"
                  value={novoItemCategoria}
                  onChange={(e) => setNovoItemCategoria(e.target.value)}
                  placeholder="Ex: Elétrica"
                  maxLength={40}
                  className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                />
              </div>
              <div className="sm:w-40">
                <MoneyField label="Valor (R$)" max={VALOR_MAXIMO_REAIS} value={novoItemValor} onChange={setNovoItemValor} />
              </div>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={adicionarItemCatalogo}>
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
        maxLength={40}
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

function LinhaItemCatalogo({
  item,
  onSalvar,
  onExcluir,
}: {
  item: ItemCatalogo
  onSalvar: (categoria: string, nome: string, valor: number) => void
  onExcluir: () => void
}) {
  const [categoria, setCategoria] = useState(item.categoria)
  const [nome, setNome] = useState(item.nome)
  const [valor, setValor] = useState(item.valor_unitario)
  const alterado = categoria !== item.categoria || nome !== item.nome || valor !== item.valor_unitario

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={TEXTO_MAXIMO_PADRAO}
        className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
      />
      <input
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        maxLength={40}
        className="sm:w-36 border-0 bg-transparent text-xs text-graphite focus:outline-none"
      />
      <div className="sm:w-32">
        <MoneyField label="" value={valor} onChange={setValor} max={VALOR_MAXIMO_REAIS} />
      </div>
      {alterado && (
        <button
          onClick={() => onSalvar(categoria, nome, valor)}
          className="text-xs text-brass font-medium hover:text-brass-dark shrink-0"
        >
          Salvar
        </button>
      )}
      <button onClick={onExcluir} className="text-xs text-graphite hover:text-red-500 shrink-0">
        Remover
      </button>
    </div>
  )
}
