import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { IconeChevron, MoneyField, NumberField, PasswordField, SelectField } from '../components/Field'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { TEXTO_MAXIMO_PADRAO, VALOR_MAXIMO_REAIS } from '../lib/formatacao'
import { formatarMoeda } from '../lib/calculo'
import { trocarSenha } from '../lib/auth'
import { regrasSenha } from '../lib/senha'
import type { Config, Dificuldade, ItemCatalogo, TipoOrcamento, UsuarioSessao } from '../lib/types'
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

const TIPOS: TipoOrcamento[] = ['Elétrica', 'Mecânica', 'Outros']

export function Configuracoes({
  onVoltar,
  usuarioLogado,
}: {
  onVoltar: () => void
  usuarioLogado: UsuarioSessao
}) {
  const [config, setConfig] = useState<Config | null>(null)
  const [dificuldades, setDificuldades] = useState<Dificuldade[]>([])
  const [itensCatalogo, setItensCatalogo] = useState<ItemCatalogo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoMultiplicador, setNovoMultiplicador] = useState(1)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [mostrarModalValores, setMostrarModalValores] = useState(false)
  const [mostrarFormNovoNivel, setMostrarFormNovoNivel] = useState(false)

  // ---- Minha conta (trocar senha) ----
  const [mostrarModalConta, setMostrarModalConta] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenhaConta, setNovaSenhaConta] = useState('')
  const [confirmarNovaSenhaConta, setConfirmarNovaSenhaConta] = useState('')
  const [erroSenhaConta, setErroSenhaConta] = useState<string | null>(null)
  const [mensagemSenhaConta, setMensagemSenhaConta] = useState<string | null>(null)
  const [salvandoSenhaConta, setSalvandoSenhaConta] = useState(false)

  async function salvarNovaSenha() {
    setErroSenhaConta(null)
    setMensagemSenhaConta(null)
    setSalvandoSenhaConta(true)
    try {
      await trocarSenha({
        usuario: usuarioLogado.usuario,
        senhaAtual,
        novaSenha: novaSenhaConta,
        confirmarNovaSenha: confirmarNovaSenhaConta,
      })
      setSenhaAtual('')
      setNovaSenhaConta('')
      setConfirmarNovaSenhaConta('')
      setMensagemSenhaConta('Senha atualizada com sucesso.')
    } catch (e) {
      setErroSenhaConta(e instanceof Error ? e.message : 'Não foi possível trocar a senha.')
    } finally {
      setSalvandoSenhaConta(false)
    }
  }

  // ---- Novo item de catálogo ----
  const [novoItemNome, setNovoItemNome] = useState('')
  const [novoItemCategoria, setNovoItemCategoria] = useState<TipoOrcamento>('Elétrica')
  const [novoItemSubcategoria, setNovoItemSubcategoria] = useState('')
  const [novoItemValor, setNovoItemValor] = useState(0)
  const [mostrarFormNovoItem, setMostrarFormNovoItem] = useState(false)

  // Busca livre por nome/subcategoria — com listas grandes (ex: 100 itens)
  // é bem mais rápido achar o item digitando do que abrindo grupo por grupo.
  const [buscaCatalogo, setBuscaCatalogo] = useState('')
  // Categorias/subcategorias abertas (accordion). Ficam todas fechadas por
  // padrão pra não jogar a tela cheia de informação de uma vez.
  const [categoriasAbertas, setCategoriasAbertas] = useState<Set<TipoOrcamento>>(new Set())
  const [subcategoriasAbertas, setSubcategoriasAbertas] = useState<Set<string>>(new Set())

  function alternarCategoria(cat: TipoOrcamento) {
    setCategoriasAbertas((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function alternarSubcategoria(chave: string) {
    setSubcategoriasAbertas((prev) => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }

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

  const subcategoriasExistentes = useMemo(
    () => Array.from(new Set(itensCatalogo.map((i) => i.subcategoria))),
    [itensCatalogo]
  )

  // Enquanto a pessoa está buscando, filtra por nome/subcategoria e abre
  // tudo automaticamente — sem busca, os grupos ficam fechados por padrão.
  const termoBusca = buscaCatalogo.trim().toLowerCase()
  const buscando = termoBusca.length > 0

  const itensFiltrados = useMemo(() => {
    if (!termoBusca) return itensCatalogo
    return itensCatalogo.filter(
      (i) => i.nome.toLowerCase().includes(termoBusca) || i.subcategoria.toLowerCase().includes(termoBusca)
    )
  }, [itensCatalogo, termoBusca])

  const catalogoPorCategoria = useMemo(() => {
    const mapa = new Map<TipoOrcamento, Map<string, ItemCatalogo[]>>()
    for (const item of itensFiltrados) {
      if (!mapa.has(item.categoria)) mapa.set(item.categoria, new Map())
      const porSubcategoria = mapa.get(item.categoria)!
      if (!porSubcategoria.has(item.subcategoria)) porSubcategoria.set(item.subcategoria, [])
      porSubcategoria.get(item.subcategoria)!.push(item)
    }
    return mapa
  }, [itensFiltrados])

  async function adicionarItemCatalogo() {
    if (!novoItemNome.trim() || !novoItemSubcategoria.trim()) return
    const criado = await criarItemCatalogo(
      novoItemCategoria,
      novoItemSubcategoria.trim(),
      novoItemNome.trim(),
      novoItemValor
    )
    setItensCatalogo((prev) =>
      [...prev, criado].sort(
        (a, b) =>
          a.categoria.localeCompare(b.categoria) ||
          a.subcategoria.localeCompare(b.subcategoria) ||
          a.nome.localeCompare(b.nome)
      )
    )
    setNovoItemNome('')
    setNovoItemValor(0)
  }

  async function editarItemCatalogo(
    id: string,
    categoria: TipoOrcamento,
    subcategoria: string,
    nome: string,
    valor_unitario: number
  ) {
    const atualizado = await atualizarItemCatalogo(id, { categoria, subcategoria, nome, valor_unitario })
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
          {!mostrarModalConta ? (
            <button
              onClick={() => setMostrarModalConta(true)}
              className="w-full flex items-center justify-between gap-4 border border-line p-4 mb-4 text-left hover:border-brass transition-colors"
            >
              <span className="min-w-0">
                <span className="block font-display font-semibold text-lg text-ink">Minha conta</span>
                <span className="block text-xs text-graphite mt-0.5">
                  Logado como {usuarioLogado.nome} ({usuarioLogado.usuario}) — trocar senha
                </span>
              </span>
              <IconeChevron className="-rotate-90 text-graphite shrink-0" />
            </button>
          ) : (
            <Modal
              title="Minha conta"
              onClose={() => {
                setMostrarModalConta(false)
                setErroSenhaConta(null)
                setMensagemSenhaConta(null)
              }}
            >
              <p className="text-sm text-graphite mb-6">
                Logado como <span className="text-ink font-medium">{usuarioLogado.nome}</span> (usuário{' '}
                <span className="text-ink font-medium">{usuarioLogado.usuario}</span>)
              </p>

              <p className="text-[11px] tracking-wide text-graphite mb-4">TROCAR SENHA</p>

              {erroSenhaConta && (
                <div className="mb-4 border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3">
                  {erroSenhaConta}
                </div>
              )}

              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  salvarNovaSenha()
                }}
              >
                <PasswordField
                  label="Senha atual"
                  value={senhaAtual}
                  onChange={setSenhaAtual}
                  autoComplete="current-password"
                />
                <div>
                  <PasswordField
                    label="Nova senha"
                    value={novaSenhaConta}
                    onChange={setNovaSenhaConta}
                    autoComplete="new-password"
                  />
                  {novaSenhaConta && (
                    <ul className="mt-1.5 space-y-0.5">
                      {regrasSenha(novaSenhaConta).map((r) => (
                        <li
                          key={r.label}
                          className={`text-[11px] flex items-center gap-1.5 ${
                            r.ok ? 'text-green-600 dark:text-green-400' : 'text-graphite/70'
                          }`}
                        >
                          <span>{r.ok ? '✓' : '·'}</span>
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <PasswordField
                  label="Confirmar nova senha"
                  value={confirmarNovaSenhaConta}
                  onChange={setConfirmarNovaSenhaConta}
                  autoComplete="new-password"
                />

                <div className="flex items-center gap-4">
                  <Button type="submit" disabled={salvandoSenhaConta}>
                    {salvandoSenhaConta ? 'Salvando…' : 'Salvar nova senha'}
                  </Button>
                  {mensagemSenhaConta && <span className="text-sm text-brass">{mensagemSenhaConta}</span>}
                </div>
              </form>
            </Modal>
          )}

          {!mostrarModalValores ? (
            <button
              onClick={() => setMostrarModalValores(true)}
              className="w-full flex items-center justify-between gap-4 border border-line p-4 mb-10 text-left hover:border-brass transition-colors"
            >
              <span className="min-w-0">
                <span className="block font-display font-semibold text-lg text-ink">
                  Valores e níveis de dificuldade
                </span>
                <span className="block text-xs text-graphite mt-0.5">
                  Deslocamento, refeição, diária técnica, NFe e multiplicadores de risco
                </span>
              </span>
              <IconeChevron className="-rotate-90 text-graphite shrink-0" />
            </button>
          ) : (
            <Modal title="Valores e níveis de dificuldade" onClose={() => setMostrarModalValores(false)}>
              <section className="mb-10">
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

                <div className="divide-y divide-line border-t border-b border-line mb-4">
                  {dificuldades.map((d) => (
                    <LinhaDificuldade
                      key={d.id}
                      dificuldade={d}
                      onSalvar={(nome, mult) => editarDificuldade(d.id, nome, mult)}
                      onExcluir={() => excluirDificuldade(d.id)}
                    />
                  ))}
                </div>

                {!mostrarFormNovoNivel ? (
                  <button
                    onClick={() => setMostrarFormNovoNivel(true)}
                    className="text-sm text-brass hover:text-brass-dark font-medium"
                  >
                    + Adicionar nível
                  </button>
                ) : (
                  <div className="border border-line p-4">
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
                          autoFocus
                          className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                        />
                      </div>
                      <div className="sm:w-32">
                        <NumberField
                          label="Multiplicador"
                          min={1}
                          value={novoMultiplicador}
                          onChange={setNovoMultiplicador}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <Button
                        className="w-full sm:w-auto"
                        variant="secondary"
                        onClick={async () => {
                          await adicionarDificuldade()
                          setMostrarFormNovoNivel(false)
                        }}
                      >
                        Adicionar
                      </Button>
                      <button
                        onClick={() => setMostrarFormNovoNivel(false)}
                        className="text-sm text-graphite hover:text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </Modal>
          )}

          <section className="mt-14">
            <p className="text-[11px] tracking-wide text-graphite mb-2">
              ITENS PREDEFINIDOS (CATÁLOGO)
            </p>
            <p className="text-sm text-graphite mb-4">
              Aparecem no select de item ao criar um orçamento, já filtrados pelo tipo escolhido
              no passo 1 (Elétrica / Mecânica / Outros) e agrupados por subcategoria (ex:
              Residencial, Industrial, Comercial). Escolher um deles preenche a descrição e o
              valor unitário do item.
            </p>

            <datalist id="subcategorias-existentes">
              {subcategoriasExistentes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <div className="mb-6">
              <input
                value={buscaCatalogo}
                onChange={(e) => setBuscaCatalogo(e.target.value)}
                placeholder="Buscar item por nome ou subcategoria…"
                className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
              />
            </div>

            {itensCatalogo.length === 0 && (
              <p className="text-sm text-graphite/70 mb-6">Nenhum item cadastrado ainda.</p>
            )}
            {itensCatalogo.length > 0 && catalogoPorCategoria.size === 0 && (
              <p className="text-sm text-graphite/70 mb-6">Nenhum item encontrado para "{buscaCatalogo}".</p>
            )}

            <div className="border-t border-line mb-6">
              {TIPOS.filter((tipo) => catalogoPorCategoria.has(tipo)).map((tipo) => {
                const subcategorias = catalogoPorCategoria.get(tipo)!
                const totalCategoria = Array.from(subcategorias.values()).reduce((n, l) => n + l.length, 0)
                const aberta = buscando || categoriasAbertas.has(tipo)
                return (
                  <div key={tipo} className="border-b border-line">
                    <button
                      onClick={() => alternarCategoria(tipo)}
                      className="w-full flex items-center justify-between py-3 text-left"
                    >
                      <span className="text-[11px] tracking-wide text-brass uppercase font-semibold">
                        {tipo}{' '}
                        <span className="text-graphite normal-case font-normal">
                          ({totalCategoria} {totalCategoria === 1 ? 'item' : 'itens'})
                        </span>
                      </span>
                      <IconeChevron
                        className={`text-graphite transition-transform ${aberta ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {aberta && (
                      <div className="pb-4">
                        {Array.from(subcategorias.entries()).map(([subcategoria, itensDoGrupo]) => {
                          const chave = `${tipo}::${subcategoria}`
                          const subAberta = buscando || subcategoriasAbertas.has(chave)
                          return (
                            <div key={subcategoria} className="mb-2 pl-1">
                              <button
                                onClick={() => alternarSubcategoria(chave)}
                                className="w-full flex items-center justify-between py-2 text-left"
                              >
                                <span className="text-[11px] text-graphite">
                                  {subcategoria}{' '}
                                  <span className="text-graphite/60">
                                    ({itensDoGrupo.length})
                                  </span>
                                </span>
                                <IconeChevron
                                  className={`text-graphite/70 transition-transform ${subAberta ? 'rotate-180' : ''}`}
                                />
                              </button>
                              {subAberta && (
                                <div className="divide-y divide-line border-t border-b border-line">
                                  {itensDoGrupo.map((item) => (
                                    <LinhaItemCatalogo
                                      key={item.id}
                                      item={item}
                                      onSalvar={(categoria, subcategoria, nome, valor) =>
                                        editarItemCatalogo(item.id, categoria, subcategoria, nome, valor)
                                      }
                                      onExcluir={() => excluirItemCatalogo(item.id)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!mostrarFormNovoItem ? (
              <Button variant="secondary" onClick={() => setMostrarFormNovoItem(true)}>
                + Adicionar item ao catálogo
              </Button>
            ) : (
              <Modal title="Adicionar item ao catálogo" onClose={() => setMostrarFormNovoItem(false)}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <span className="block text-[11px] tracking-wide text-graphite mb-1.5">
                      Nome do item
                    </span>
                    <input
                      value={novoItemNome}
                      onChange={(e) => setNovoItemNome(e.target.value)}
                      placeholder="Ex: Instalação de disjuntor monofásico"
                      maxLength={TEXTO_MAXIMO_PADRAO}
                      autoFocus
                      className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                    />
                  </div>
                  <SelectField
                    label="Categoria"
                    value={novoItemCategoria}
                    onChange={(v) => setNovoItemCategoria(v as TipoOrcamento)}
                  >
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </SelectField>
                  <div>
                    <span className="block text-[11px] tracking-wide text-graphite mb-1.5">
                      Subcategoria
                    </span>
                    <input
                      list="subcategorias-existentes"
                      value={novoItemSubcategoria}
                      onChange={(e) => setNovoItemSubcategoria(e.target.value)}
                      placeholder="Ex: Residencial, Industrial, Comercial…"
                      maxLength={40}
                      className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                    />
                  </div>
                  <MoneyField
                    label="Valor (R$)"
                    max={VALOR_MAXIMO_REAIS}
                    value={novoItemValor}
                    onChange={setNovoItemValor}
                  />
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={async () => {
                      await adicionarItemCatalogo()
                      setMostrarFormNovoItem(false)
                    }}
                  >
                    Adicionar item
                  </Button>
                  <button
                    onClick={() => setMostrarFormNovoItem(false)}
                    className="text-sm text-graphite hover:text-ink"
                  >
                    Cancelar
                  </button>
                </div>
              </Modal>
            )}
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

/**
 * Linha do item do catálogo: por padrão mostra só um resumo (nome + valor)
 * pra não poluir a tela quando há muitos itens — os campos de edição só
 * aparecem quando a pessoa clica em "Editar".
 */
function LinhaItemCatalogo({
  item,
  onSalvar,
  onExcluir,
}: {
  item: ItemCatalogo
  onSalvar: (categoria: TipoOrcamento, subcategoria: string, nome: string, valor: number) => void
  onExcluir: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [categoria, setCategoria] = useState<TipoOrcamento>(item.categoria)
  const [subcategoria, setSubcategoria] = useState(item.subcategoria)
  const [nome, setNome] = useState(item.nome)
  const [valor, setValor] = useState(item.valor_unitario)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  function abrirEdicao() {
    setCategoria(item.categoria)
    setSubcategoria(item.subcategoria)
    setNome(item.nome)
    setValor(item.valor_unitario)
    setEditando(true)
  }

  function salvar() {
    onSalvar(categoria, subcategoria, nome, valor)
    setEditando(false)
  }

  if (!editando) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm text-ink truncate">{item.nome}</p>
          <p className="text-xs text-graphite tabular">{formatarMoeda(item.valor_unitario)}</p>
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
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-ink truncate">{item.nome}</p>
        <p className="text-xs text-graphite tabular">{formatarMoeda(item.valor_unitario)}</p>
      </div>

      <Modal title="Editar item" onClose={() => setEditando(false)}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <span className="block text-[11px] tracking-wide text-graphite mb-1.5">Nome do item</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={TEXTO_MAXIMO_PADRAO}
              autoFocus
              className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink focus:outline-none focus:border-brass transition-colors"
            />
          </div>
          <SelectField label="Categoria" value={categoria} onChange={(v) => setCategoria(v as TipoOrcamento)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectField>
          <div>
            <span className="block text-[11px] tracking-wide text-graphite mb-1.5">Subcategoria</span>
            <input
              list="subcategorias-existentes"
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              maxLength={40}
              className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink focus:outline-none focus:border-brass transition-colors"
            />
          </div>
          <MoneyField label="Valor (R$)" max={VALOR_MAXIMO_REAIS} value={valor} onChange={setValor} />
        </div>
        <div className="flex items-center gap-4 mt-6">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={salvar}>
            Salvar
          </Button>
          <button onClick={() => setEditando(false)} className="text-sm text-graphite hover:text-ink">
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}
