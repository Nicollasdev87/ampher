import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Field, MoneyField, NumberField, PhoneField, SelectField, ToggleField } from '../components/Field'
import { FormularioCliente } from '../components/FormularioCliente'
import { PageHeader } from '../components/PageHeader'
import type { Cliente, Config, Dificuldade, ItemCatalogo, ItemOrcamento, Orcamento, TipoOrcamento } from '../lib/types'
import { calcularOrcamento, formatarMoeda, totalItem } from '../lib/calculo'
import { DADOS_CLIENTE_VAZIOS, type DadosCliente } from '../lib/cliente-form'
import { OBSERVACAO_ITEM_MAXIMO, TEXTO_MAXIMO_PADRAO, VALOR_MAXIMO_REAIS } from '../lib/formatacao'
import {
  criarCliente,
  criarOrcamento,
  getConfig,
  listarClientes,
  listarDificuldades,
  listarItensCatalogo,
  proximoNumeroOrcamento,
} from '../lib/api'
import { baixarPdfOrcamento } from '../lib/pdf'

type Passo = 1 | 2 | 3 | 4

/**
 * Fluxo da pergunta "esse cliente já está cadastrado?" no passo 1:
 * - perguntar: pergunta inicial (cadastrado ou não)
 * - existente: buscar/selecionar um cliente já cadastrado
 * - perguntar-cadastro: cliente novo — pergunta se quer cadastrar ou só usar aqui
 * - novo-cadastrar: formulário completo (nome, telefones, endereço, mapa) —
 *   o cliente é criado de fato ao avançar pro passo 2
 * - avulso: campos simples de sempre (nome/telefone/local), sem salvar cliente
 */
type ModoCliente = 'perguntar' | 'existente' | 'perguntar-cadastro' | 'novo-cadastrar' | 'avulso'

const TIPOS: TipoOrcamento[] = ['Elétrica', 'Mecânica', 'Outros']

/**
 * Agrupa os itens do catálogo (já filtrados por categoria/tipo) por
 * subcategoria, preservando a ordem em que cada uma aparece (a lista já
 * vem ordenada por categoria/subcategoria lá do banco).
 */
function agruparPorSubcategoria(itens: ItemCatalogo[]): Map<string, ItemCatalogo[]> {
  const mapa = new Map<string, ItemCatalogo[]>()
  for (const item of itens) {
    if (!mapa.has(item.subcategoria)) mapa.set(item.subcategoria, [])
    mapa.get(item.subcategoria)!.push(item)
  }
  return mapa
}

function novoItemVazio(dificuldadePadraoId: string | null, secao: string | null = null): ItemOrcamento {
  return {
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    dificuldade_id: dificuldadePadraoId,
    ordem: 0,
    secao,
    observacao: '',
  }
}

export function NovoOrcamento({
  onVoltar,
  nomeResponsavel,
}: {
  onVoltar: () => void
  /** Nome de quem está logado — preenchido automaticamente, sem campo no formulário. */
  nomeResponsavel: string
}) {
  const [passo, setPasso] = useState<Passo>(1)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [config, setConfig] = useState<Config | null>(null)
  const [dificuldades, setDificuldades] = useState<Dificuldade[]>([])
  const [itensCatalogo, setItensCatalogo] = useState<ItemCatalogo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  // Dados do orçamento
  const [modoCliente, setModoCliente] = useState<ModoCliente>('perguntar')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [telefoneEscolhido, setTelefoneEscolhido] = useState('')
  const [dadosNovoCliente, setDadosNovoCliente] = useState<DadosCliente>(DADOS_CLIENTE_VAZIOS)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteContato, setClienteContato] = useState('')
  const [localServico, setLocalServico] = useState('')
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [tipo, setTipo] = useState<TipoOrcamento>('Elétrica')

  const [itens, setItens] = useState<ItemOrcamento[]>([])
  // Estado auxiliar de UI, em paralelo a `itens` (mesmo índice) — não é
  // salvo no banco. `catalogoSelecionado` guarda qual item do catálogo
  // está marcado no select de cada linha (pra ele continuar mostrando a
  // escolha feita, já que não existe mais campo de descrição visível).
  // `mostrarObs` controla se o campo de observação daquele item aparece.
  const [catalogoSelecionado, setCatalogoSelecionado] = useState<(string | null)[]>([])
  const [mostrarObs, setMostrarObs] = useState<boolean[]>([])
  // Seções criadas explicitamente pela pessoa (ordem de criação). Cada
  // item guarda o nome da seção em `item.secao`; itens sem seção (criados
  // fora de qualquer bloco) ficam soltos na lista "sem seção" no topo.
  const [secoes, setSecoes] = useState<string[]>([])

  const [dias, setDias] = useState(1)
  // "Técnico adicional": pergunta feita antes de pedir a quantidade. Se
  // não houver, a diária técnica fica em 0 — mas refeição e deslocamento
  // continuam sendo calculados normalmente (o técnico responsável já conta).
  const [temTecnicoAdicional, setTemTecnicoAdicional] = useState(false)
  const [numTecnicosAdicionais, setNumTecnicosAdicionais] = useState(1)
  const [desconto, setDesconto] = useState(0)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [prazoExecucao, setPrazoExecucao] = useState('')
  const [garantiaServico, setGarantiaServico] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const [cfg, difs, catalogo, listaClientes] = await Promise.all([
          getConfig(),
          listarDificuldades(),
          listarItensCatalogo(),
          listarClientes(),
        ])
        setConfig(cfg)
        setDificuldades(difs)
        setItensCatalogo(catalogo)
        setClientes(listaClientes)
        const padrao = difs.find((d) => d.multiplicador === 1) ?? difs[0] ?? null
        // Já começa com uma seção padrão (em vez de item "solto"), pra
        // sempre ter um lugar visível pra dar nome à seção desde o início.
        const secaoInicial = 'Seção 1'
        setSecoes([secaoInicial])
        setItens([novoItemVazio(padrao?.id ?? null, secaoInicial)])
        setCatalogoSelecionado([null])
        setMostrarObs([false])
      } catch {
        setErro(
          'Não foi possível carregar as configurações. Verifique a conexão com o Supabase.'
        )
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  // Diária técnica só considera os adicionais (0 se a resposta for "não").
  // Refeição/deslocamento usam o total, que já inclui o técnico responsável.
  const numTecnicosAdicionaisEfetivo = temTecnicoAdicional ? numTecnicosAdicionais : 0
  const numTecnicosTotal = 1 + numTecnicosAdicionaisEfetivo

  const resultado = useMemo(() => {
    if (!config) return null
    return calcularOrcamento({
      itens,
      dificuldades,
      dias,
      numTecnicos: numTecnicosTotal,
      numTecnicosDiaria: numTecnicosAdicionaisEfetivo,
      desconto,
      config,
    })
  }, [itens, dificuldades, dias, numTecnicosTotal, numTecnicosAdicionaisEfetivo, desconto, config])

  const catalogoDoTipo = useMemo(() => itensCatalogo.filter((i) => i.categoria === tipo), [itensCatalogo, tipo])
  const catalogoPorSubcategoria = useMemo(() => agruparPorSubcategoria(catalogoDoTipo), [catalogoDoTipo])
  const mapaCatalogo = useMemo(() => new Map(itensCatalogo.map((i) => [i.id, i])), [itensCatalogo])

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase()
    if (!termo) return clientes
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo))
  }, [clientes, buscaCliente])

  function selecionarCliente(c: Cliente) {
    setClienteSelecionado(c)
    setTelefoneEscolhido(c.telefones[0] ?? '')
    setLocalServico(c.endereco ?? '')
  }

  function trocarCliente() {
    setClienteSelecionado(null)
    setBuscaCliente('')
  }

  // Valores efetivos de cliente/contato usados no orçamento, conforme o
  // modo escolhido no passo 1.
  const clienteNomeEfetivo =
    modoCliente === 'existente'
      ? (clienteSelecionado?.nome ?? '')
      : modoCliente === 'novo-cadastrar'
        ? dadosNovoCliente.nome
        : clienteNome

  const clienteContatoEfetivo =
    modoCliente === 'existente'
      ? telefoneEscolhido
      : modoCliente === 'novo-cadastrar'
        ? (dadosNovoCliente.telefones.find((t) => t.trim()) ?? '')
        : clienteContato

  const localServicoEfetivo = modoCliente === 'novo-cadastrar' ? dadosNovoCliente.endereco : localServico

  const clienteValidoPasso1 =
    modoCliente === 'existente'
      ? !!clienteSelecionado
      : modoCliente === 'novo-cadastrar'
        ? dadosNovoCliente.nome.trim().length > 0
        : modoCliente === 'avulso'
          ? clienteNome.trim().length > 0
          : false

  function atualizarItem(idx: number, patch: Partial<ItemOrcamento>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function adicionarItem(secao: string | null = null) {
    const padrao = dificuldades.find((d) => d.multiplicador === 1) ?? dificuldades[0] ?? null
    setItens((prev) => [...prev, novoItemVazio(padrao?.id ?? null, secao)])
    setCatalogoSelecionado((prev) => [...prev, null])
    setMostrarObs((prev) => [...prev, false])
  }

  function removerItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx))
    setCatalogoSelecionado((prev) => prev.filter((_, i) => i !== idx))
    setMostrarObs((prev) => prev.filter((_, i) => i !== idx))
  }

  // Cria uma nova seção e já entra com um item vazio dentro dela, pra
  // pessoa poder começar a preencher na hora.
  function adicionarSecao() {
    const nome = `Seção ${secoes.length + 1}`
    setSecoes((prev) => [...prev, nome])
    adicionarItem(nome)
  }

  // Renomear cascateia pro nome de seção de todos os itens que estavam
  // naquele nome (o vínculo item→seção é pelo texto do nome).
  function renomearSecao(nomeAtual: string, novoNome: string) {
    setSecoes((prev) => prev.map((s) => (s === nomeAtual ? novoNome : s)))
    setItens((prev) => prev.map((it) => (it.secao === nomeAtual ? { ...it, secao: novoNome } : it)))
  }

  // Remove a seção da lista, mas não apaga os itens — eles voltam a
  // aparecer soltos em "sem seção" pra não perder o que já foi cadastrado.
  function removerSecao(nome: string) {
    setSecoes((prev) => prev.filter((s) => s !== nome))
    setItens((prev) => prev.map((it) => (it.secao === nome ? { ...it, secao: null } : it)))
  }

  const itensSemSecao = itens.map((item, idx) => ({ item, idx })).filter(({ item }) => !item.secao)
  function itensDaSecao(nome: string) {
    return itens.map((item, idx) => ({ item, idx })).filter(({ item }) => item.secao === nome)
  }

  function renderItemCard(item: ItemOrcamento, idx: number) {
    return (
      <div key={idx} className="border border-line p-4 relative">
        <div className="mb-1">
          <SelectField
            label=""
            value={catalogoSelecionado[idx] ?? ''}
            onChange={(v) => {
              setCatalogoSelecionado((prev) => prev.map((c, i) => (i === idx ? v || null : c)))
              if (!v) {
                atualizarItem(idx, { descricao: '', valor_unitario: 0 })
                return
              }
              const escolhido = mapaCatalogo.get(v)
              if (!escolhido) return
              atualizarItem(idx, {
                descricao: escolhido.nome,
                valor_unitario: escolhido.valor_unitario,
              })
            }}
          >
            <option value="">Adicionar novo item</option>
            {Array.from(catalogoPorSubcategoria.entries()).map(([subcategoria, itensDoGrupo]) => (
              <optgroup key={subcategoria} label={subcategoria}>
                {itensDoGrupo.map((ic) => (
                  <option key={ic.id} value={ic.id}>
                    {ic.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>
        </div>
        {item.descricao && (
          <p className="text-xs text-graphite mb-3">
            Item: <span className="text-ink">{item.descricao}</span>
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-3">
          <NumberField
            label="Quantidade"
            min={0}
            max={9999}
            value={item.quantidade}
            onChange={(v) => atualizarItem(idx, { quantidade: v })}
          />
          <MoneyField
            label="Valor unitário (R$)"
            max={VALOR_MAXIMO_REAIS}
            value={item.valor_unitario}
            onChange={(v) => atualizarItem(idx, { valor_unitario: v })}
          />
          <SelectField
            label="Nível de dificuldade"
            value={item.dificuldade_id ?? ''}
            onChange={(v) => atualizarItem(idx, { dificuldade_id: v })}
          >
            {dificuldades.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </SelectField>
        </div>

        <ToggleField
          label="Adicionar observação a este item"
          checked={mostrarObs[idx] ?? false}
          onChange={(v) => {
            setMostrarObs((prev) => prev.map((m, i) => (i === idx ? v : m)))
            if (!v) atualizarItem(idx, { observacao: '' })
          }}
        />
        {mostrarObs[idx] && (
          <div className="mt-3">
            <Field
              label="Observação do item"
              value={item.observacao ?? ''}
              onChange={(e) => atualizarItem(idx, { observacao: e.target.value })}
              placeholder="Ex: Inclui material, não inclui andaime…"
              maxLength={OBSERVACAO_ITEM_MAXIMO}
            />
          </div>
        )}

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-line">
          <span className="text-xs text-graphite">
            Total do item:{' '}
            <span className="text-ink font-semibold tabular">
              {formatarMoeda(totalItem(item, dificuldades.find((d) => d.id === item.dificuldade_id)))}
            </span>
          </span>
          {itens.length > 1 && (
            <Button variant="danger" onClick={() => removerItem(idx)}>
              Remover
            </Button>
          )}
        </div>
      </div>
    )
  }

  const podeAvancarPasso1 = clienteValidoPasso1 && tipo
  const podeAvancarPasso2 = itens.length > 0 && itens.every((i) => i.descricao.trim() && i.quantidade > 0)

  async function finalizar() {
    if (!config || !resultado) return
    setSalvando(true)
    setErro(null)
    try {
      let clienteId: string | null = clienteSelecionado?.id ?? null
      if (modoCliente === 'novo-cadastrar') {
        const clienteCriado = await criarCliente({
          nome: dadosNovoCliente.nome.trim(),
          telefones: dadosNovoCliente.telefones.map((t) => t.trim()).filter(Boolean),
          endereco: dadosNovoCliente.endereco.trim() || null,
          latitude: dadosNovoCliente.latitude,
          longitude: dadosNovoCliente.longitude,
          observacao: null,
        })
        clienteId = clienteCriado.id
      }

      const numero = await proximoNumeroOrcamento()
      const orcamento: Orcamento = {
        numero,
        responsavel: nomeResponsavel,
        cliente_id: clienteId,
        cliente_nome: clienteNomeEfetivo,
        cliente_contato: clienteContatoEfetivo,
        local_servico: localServicoEfetivo,
        tipo,
        dias,
        num_tecnicos: numTecnicosTotal,
        desconto,
        forma_pagamento: formaPagamento,
        prazo_execucao: prazoExecucao,
        garantia_servico: garantiaServico,
        observacoes: nomeProjeto,
        status: 'pendente',
        subtotal_itens: resultado.subtotalItens,
        valor_deslocamento_total: resultado.valorDeslocamentoTotal,
        valor_refeicao_total: resultado.valorRefeicaoTotal,
        valor_diaria_tecnicos_total: resultado.valorDiariaTecnicosTotal,
        valor_nfe: resultado.valorNfe,
        total_geral: resultado.totalGeral,
      }
      const criado = await criarOrcamento(orcamento, itens)
      await baixarPdfOrcamento(criado, dificuldades)
      setPasso(4)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar o orçamento. Tente novamente.')
    } finally {
      setSalvando(false)
    }
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
      <PageHeader
        eyebrow="CRIAR ORÇAMENTO"
        onVoltar={passo < 4 ? onVoltar : undefined}
        extra={
          passo < 4 ? (
            <span className="text-xs text-graphite tabular shrink-0">Passo {passo} de 3</span>
          ) : undefined
        }
      />

      {erro && (
        <div className="mx-5 sm:mx-10 mb-4 border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3">
          {erro}
        </div>
      )}

      <main className="flex-1 px-5 sm:px-10 pb-16">
        <div className="max-w-2xl mx-auto">
          {passo === 1 && (
            <section>
              <p className="text-[11px] tracking-[0.15em] text-brass mb-2">01 · DADOS GERAIS</p>
              <h2 className="font-display font-semibold text-3xl mb-8">Sobre esse orçamento</h2>

              <div className="space-y-6">
                <div>
                  <span className="block text-[11px] tracking-wide text-graphite mb-3">Cliente</span>

                  {modoCliente === 'perguntar' && (
                    <div className="border border-line p-4">
                      <p className="text-sm text-ink mb-3">Esse cliente já está cadastrado?</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant="secondary"
                          className="w-full sm:w-auto"
                          onClick={() => setModoCliente('existente')}
                        >
                          Sim, já é cliente
                        </Button>
                        <Button
                          variant="secondary"
                          className="w-full sm:w-auto"
                          onClick={() => setModoCliente('perguntar-cadastro')}
                        >
                          Não, cliente novo
                        </Button>
                      </div>
                    </div>
                  )}

                  {modoCliente === 'perguntar-cadastro' && (
                    <div className="border border-line p-4">
                      <p className="text-sm text-ink mb-3">
                        Quer cadastrar esse cliente pra usar em orçamentos futuros?
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant="secondary"
                          className="w-full sm:w-auto"
                          onClick={() => setModoCliente('novo-cadastrar')}
                        >
                          Sim, cadastrar
                        </Button>
                        <Button
                          variant="secondary"
                          className="w-full sm:w-auto"
                          onClick={() => setModoCliente('avulso')}
                        >
                          Não, só usar aqui
                        </Button>
                      </div>
                      <button
                        onClick={() => setModoCliente('perguntar')}
                        className="mt-3 text-xs text-graphite hover:text-ink"
                      >
                        ← Voltar
                      </button>
                    </div>
                  )}

                  {modoCliente === 'existente' && (
                    <div className="border border-line p-4">
                      {!clienteSelecionado ? (
                        <>
                          <input
                            value={buscaCliente}
                            onChange={(e) => setBuscaCliente(e.target.value)}
                            placeholder="Buscar cliente por nome…"
                            autoFocus
                            className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors mb-3"
                          />
                          {clientesFiltrados.length === 0 ? (
                            <p className="text-xs text-graphite/70">
                              {clientes.length === 0
                                ? 'Nenhum cliente cadastrado ainda.'
                                : 'Nenhum cliente encontrado.'}
                            </p>
                          ) : (
                            <div className="divide-y divide-line border-t border-b border-line max-h-56 overflow-y-auto">
                              {clientesFiltrados.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => selecionarCliente(c)}
                                  className="w-full flex flex-col items-start py-2.5 text-left hover:bg-brass/[0.04] transition-colors"
                                >
                                  <span className="text-sm text-ink">{c.nome}</span>
                                  {c.endereco && <span className="text-xs text-graphite">{c.endereco}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => setModoCliente('perguntar')}
                            className="mt-3 text-xs text-graphite hover:text-ink"
                          >
                            ← Voltar
                          </button>
                        </>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-ink font-medium truncate">{clienteSelecionado.nome}</p>
                              {clienteSelecionado.endereco && (
                                <p className="text-xs text-graphite mt-0.5">{clienteSelecionado.endereco}</p>
                              )}
                              {clienteSelecionado.telefones.length > 0 && (
                                <p className="text-xs text-graphite mt-0.5">
                                  {clienteSelecionado.telefones.join(' · ')}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={trocarCliente}
                              className="text-xs text-brass hover:text-brass-dark font-medium shrink-0"
                            >
                              Trocar
                            </button>
                          </div>
                          {clienteSelecionado.telefones.length > 1 && (
                            <div className="mt-4">
                              <SelectField
                                label="Telefone para este orçamento"
                                value={telefoneEscolhido}
                                onChange={setTelefoneEscolhido}
                              >
                                {clienteSelecionado.telefones.map((tel) => (
                                  <option key={tel} value={tel}>
                                    {tel}
                                  </option>
                                ))}
                              </SelectField>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {modoCliente === 'novo-cadastrar' && (
                    <div className="border border-line p-4">
                      <FormularioCliente dados={dadosNovoCliente} onChange={setDadosNovoCliente} />
                      <button
                        onClick={() => setModoCliente('perguntar-cadastro')}
                        className="mt-4 text-xs text-graphite hover:text-ink"
                      >
                        ← Voltar
                      </button>
                    </div>
                  )}

                  {modoCliente === 'avulso' && (
                    <div className="border border-line p-4 space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <Field
                          label="Nome do cliente / empresa"
                          value={clienteNome}
                          onChange={(e) => setClienteNome(e.target.value)}
                          placeholder="Ex: Indústria Silva Ltda"
                          maxLength={TEXTO_MAXIMO_PADRAO}
                          autoFocus
                        />
                        <PhoneField label="Telefone de contato" value={clienteContato} onChange={setClienteContato} />
                      </div>
                      <Field
                        label="Local do serviço"
                        value={localServico}
                        onChange={(e) => setLocalServico(e.target.value)}
                        placeholder="Ex: Goiânia, GO"
                        maxLength={TEXTO_MAXIMO_PADRAO}
                      />
                      <button
                        onClick={() => setModoCliente('perguntar-cadastro')}
                        className="text-xs text-graphite hover:text-ink"
                      >
                        ← Voltar
                      </button>
                    </div>
                  )}
                </div>

                {modoCliente === 'existente' && clienteSelecionado && (
                  <Field
                    label="Local do serviço"
                    value={localServico}
                    onChange={(e) => setLocalServico(e.target.value)}
                    placeholder="Ex: Goiânia, GO"
                    maxLength={TEXTO_MAXIMO_PADRAO}
                    hint="Preenchido com o endereço do cliente — edite se o serviço for em outro lugar"
                  />
                )}

                <Field
                  label="Nome do projeto / serviço"
                  value={nomeProjeto}
                  onChange={(e) => setNomeProjeto(e.target.value)}
                  placeholder="Ex: Instalação de painel elétrico industrial"
                  maxLength={TEXTO_MAXIMO_PADRAO}
                />
                <SelectField label="Tipo de orçamento" value={tipo} onChange={(v) => setTipo(v as TipoOrcamento)}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="mt-10 flex sm:justify-end">
                <Button className="w-full sm:w-auto" disabled={!podeAvancarPasso1} onClick={() => setPasso(2)}>
                  Continuar
                </Button>
              </div>
            </section>
          )}

          {passo === 2 && (
            <section>
              <p className="text-[11px] tracking-[0.15em] text-brass mb-2">02 · ITENS</p>
              <h2 className="font-display font-semibold text-3xl mb-2">O que compõe o serviço</h2>
              <p className="text-sm text-graphite mb-2">
                Cadastre os itens do serviço. Se quiser, crie seções (ex: "Quarto", "Sala",
                "Área externa") — elas aparecem como títulos no PDF. Dentro de cada seção você
                pode adicionar quantos itens quiser, e criar quantas seções precisar.
              </p>
              {catalogoDoTipo.length === 0 && (
                <p className="text-[11px] text-graphite/70 mb-6">
                  Nenhum item cadastrado para {tipo} — adicione em Configurações.
                </p>
              )}

              {itensSemSecao.length > 0 && (
                <div className="space-y-5 mt-6">
                  {itensSemSecao.map(({ item, idx }) => renderItemCard(item, idx))}
                </div>
              )}

              <button
                onClick={() => adicionarItem(null)}
                className="mt-4 text-sm text-brass hover:text-brass-dark font-medium"
              >
                + Adicionar item avulso (sem seção)
              </button>

              {secoes.length > 0 && (
                <div className="space-y-6 mt-8">
                  {secoes.map((nome, i) => (
                    <div key={i} className="border border-brass/40 bg-brass/[0.04] p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <input
                          value={nome}
                          onChange={(e) => renomearSecao(nome, e.target.value)}
                          onBlur={(e) => {
                            if (!e.target.value.trim()) renomearSecao(nome, `Seção ${i + 1}`)
                          }}
                          placeholder="Nome da seção"
                          maxLength={TEXTO_MAXIMO_PADRAO}
                          className="flex-1 border-0 border-b border-brass/40 bg-transparent py-1.5 text-sm font-semibold text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                        />
                        <button
                          onClick={() => removerSecao(nome)}
                          className="text-xs text-graphite hover:text-red-500 shrink-0"
                        >
                          Remover seção
                        </button>
                      </div>

                      {itensDaSecao(nome).length > 0 && (
                        <div className="space-y-5 mb-4">
                          {itensDaSecao(nome).map(({ item, idx }) => renderItemCard(item, idx))}
                        </div>
                      )}

                      <button
                        onClick={() => adicionarItem(nome)}
                        className="text-sm text-brass hover:text-brass-dark font-medium"
                      >
                        + Adicionar item nesta seção
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={adicionarSecao}
                className="mt-6 w-full border border-dashed border-line hover:border-brass text-sm text-graphite hover:text-brass font-medium py-3 transition-colors"
              >
                + Adicionar nova seção
              </button>

              <div className="mt-10 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setPasso(1)}>
                  Voltar
                </Button>
                <Button className="w-full sm:w-auto" disabled={!podeAvancarPasso2} onClick={() => setPasso(3)}>
                  Continuar
                </Button>
              </div>
            </section>
          )}

          {passo === 3 && resultado && (
            <section>
              <p className="text-[11px] tracking-[0.15em] text-brass mb-2">03 · EXECUÇÃO</p>
              <h2 className="font-display font-semibold text-3xl mb-8">Logística e condições</h2>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <NumberField
                  label="Dias necessários (deslocamento incluso)"
                  min={1}
                  value={dias}
                  onChange={setDias}
                />
                <div>
                  <span className="block text-[11px] tracking-wide text-graphite mb-3">
                    Técnico adicional
                  </span>
                  <ToggleField
                    label="Terá técnico adicional além do responsável?"
                    checked={temTecnicoAdicional}
                    onChange={setTemTecnicoAdicional}
                  />
                </div>
              </div>

              {temTecnicoAdicional && (
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <NumberField
                    label="Quantidade de técnicos adicionais"
                    min={1}
                    value={numTecnicosAdicionais}
                    onChange={setNumTecnicosAdicionais}
                    hint="A diária técnica é cobrada só para os adicionais — refeição e deslocamento já consideram o time todo"
                  />
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <MoneyField
                  label="Desconto (R$, opcional)"
                  max={VALOR_MAXIMO_REAIS}
                  value={desconto}
                  onChange={setDesconto}
                />
                <Field
                  label="Forma de pagamento"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  placeholder="Ex: 50% entrada + 50% na entrega"
                  maxLength={TEXTO_MAXIMO_PADRAO}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <Field
                  label="Prazo de execução"
                  value={prazoExecucao}
                  onChange={(e) => setPrazoExecucao(e.target.value)}
                  placeholder="Ex: 5 dias úteis"
                  maxLength={60}
                />
                <Field
                  label="Garantia do serviço"
                  value={garantiaServico}
                  onChange={(e) => setGarantiaServico(e.target.value)}
                  placeholder="Ex: 90 dias"
                  maxLength={60}
                />
              </div>

              <div className="border border-line p-5">
                <p className="text-[11px] tracking-wide text-graphite mb-4">RESUMO DO VALOR</p>
                <LinhaResumo label="Itens" valor={resultado.subtotalItens} />
                <LinhaResumo label="Deslocamento" valor={resultado.valorDeslocamentoTotal} />
                <LinhaResumo label="Alimentação" valor={resultado.valorRefeicaoTotal} />
                <LinhaResumo label="Mão de obra técnica" valor={resultado.valorDiariaTecnicosTotal} />
                {desconto > 0 && <LinhaResumo label="Desconto" valor={-desconto} />}
                <LinhaResumo
                  label={`Impostos (NFe ${config?.percentual_nfe ?? 0}%)`}
                  valor={resultado.valorNfe}
                />
                <div className="flex justify-between pt-3 mt-2 border-t border-ink">
                  <span className="font-display font-semibold text-lg">TOTAL GERAL</span>
                  <span className="font-display font-semibold text-lg tabular">
                    {formatarMoeda(resultado.totalGeral)}
                  </span>
                </div>
              </div>

              <div className="mt-10 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setPasso(2)}>
                  Voltar
                </Button>
                <Button className="w-full sm:w-auto" onClick={finalizar} disabled={salvando}>
                  {salvando ? 'Gerando…' : 'Finalizar e gerar PDF'}
                </Button>
              </div>
            </section>
          )}

          {passo === 4 && (
            <section className="text-center py-16">
              <p className="text-[11px] tracking-[0.15em] text-brass mb-3">CONCLUÍDO</p>
              <h2 className="font-display font-semibold text-3xl mb-4">Orçamento gerado</h2>
              <p className="text-sm text-graphite mb-8 max-w-sm mx-auto">
                O PDF foi salvo no seu dispositivo e o orçamento já está registrado no sistema.
              </p>
              <Button onClick={onVoltar}>Voltar ao início</Button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function LinhaResumo({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-graphite">{label}</span>
      <span className="tabular">{formatarMoeda(valor)}</span>
    </div>
  )
}
