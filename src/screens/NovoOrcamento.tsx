import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Field, NumberField, SelectField } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import type { Config, Dificuldade, ItemOrcamento, Orcamento, TipoOrcamento } from '../lib/types'
import { calcularOrcamento, formatarMoeda, totalItem } from '../lib/calculo'
import { criarOrcamento, getConfig, listarDificuldades, proximoNumeroOrcamento } from '../lib/api'
import { baixarPdfOrcamento } from '../lib/pdf'

type Passo = 1 | 2 | 3 | 4

const TIPOS: TipoOrcamento[] = ['Elétrica', 'Mecânica', 'Outros']

function novoItemVazio(dificuldadePadraoId: string | null, secao: string | null = null): ItemOrcamento {
  return {
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    dificuldade_id: dificuldadePadraoId,
    ordem: 0,
    secao,
  }
}

export function NovoOrcamento({ onVoltar }: { onVoltar: () => void }) {
  const [passo, setPasso] = useState<Passo>(1)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [config, setConfig] = useState<Config | null>(null)
  const [dificuldades, setDificuldades] = useState<Dificuldade[]>([])

  // Dados do orçamento
  const [responsavel, setResponsavel] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [clienteContato, setClienteContato] = useState('')
  const [localServico, setLocalServico] = useState('')
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [tipo, setTipo] = useState<TipoOrcamento>('Elétrica')

  const [itens, setItens] = useState<ItemOrcamento[]>([])

  const [dias, setDias] = useState(1)
  const [numTecnicos, setNumTecnicos] = useState(1)
  const [desconto, setDesconto] = useState(0)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [prazoExecucao, setPrazoExecucao] = useState('')
  const [garantiaServico, setGarantiaServico] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const [cfg, difs] = await Promise.all([getConfig(), listarDificuldades()])
        setConfig(cfg)
        setDificuldades(difs)
        const padrao = difs.find((d) => d.multiplicador === 1) ?? difs[0] ?? null
        setItens([novoItemVazio(padrao?.id ?? null)])
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

  const resultado = useMemo(() => {
    if (!config) return null
    return calcularOrcamento({ itens, dificuldades, dias, numTecnicos, desconto, config })
  }, [itens, dificuldades, dias, numTecnicos, desconto, config])

  // Seções já usadas neste orçamento, pra sugerir no datalist (evita digitar
  // "Quarto" com grafias diferentes em cada item sem querer).
  const secoesExistentes = useMemo(
    () => Array.from(new Set(itens.map((i) => i.secao?.trim()).filter((s): s is string => !!s))),
    [itens]
  )

  function atualizarItem(idx: number, patch: Partial<ItemOrcamento>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function adicionarItem() {
    const padrao = dificuldades.find((d) => d.multiplicador === 1) ?? dificuldades[0] ?? null
    // Novo item herda a seção do último, pra facilitar quando o usuário está
    // listando vários itens seguidos da mesma seção (ex: "Quarto").
    const ultimaSecao = itens[itens.length - 1]?.secao ?? null
    setItens((prev) => [...prev, novoItemVazio(padrao?.id ?? null, ultimaSecao)])
  }

  function removerItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx))
  }

  const podeAvancarPasso1 = responsavel.trim() && clienteNome.trim() && tipo
  const podeAvancarPasso2 = itens.length > 0 && itens.every((i) => i.descricao.trim() && i.quantidade > 0)

  async function finalizar() {
    if (!config || !resultado) return
    setSalvando(true)
    setErro(null)
    try {
      const numero = await proximoNumeroOrcamento()
      const orcamento: Orcamento = {
        numero,
        responsavel,
        cliente_nome: clienteNome,
        cliente_contato: clienteContato,
        local_servico: localServico,
        tipo,
        dias,
        num_tecnicos: numTecnicos,
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
                <Field
                  label="Seu nome (quem está criando este orçamento)"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Ex: Nicollas V."
                />
                <div className="grid sm:grid-cols-2 gap-6">
                  <Field
                    label="Nome do cliente / empresa"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Ex: Indústria Silva Ltda"
                  />
                  <Field
                    label="Contato (telefone ou e-mail)"
                    value={clienteContato}
                    onChange={(e) => setClienteContato(e.target.value)}
                    placeholder="Ex: (62) 99999-0000"
                  />
                </div>
                <Field
                  label="Local do serviço"
                  value={localServico}
                  onChange={(e) => setLocalServico(e.target.value)}
                  placeholder="Ex: Goiânia, GO"
                />
                <Field
                  label="Nome do projeto / serviço"
                  value={nomeProjeto}
                  onChange={(e) => setNomeProjeto(e.target.value)}
                  placeholder="Ex: Instalação de painel elétrico industrial"
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
              <p className="text-sm text-graphite mb-8">
                Opcionalmente, agrupe os itens em seções (ex: "Quarto", "Sala", "Área externa") —
                elas aparecem como títulos no PDF.
              </p>

              <datalist id="secoes-existentes">
                {secoesExistentes.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <div className="space-y-5">
                {itens.map((item, idx) => (
                  <div key={idx} className="border border-line p-5 relative">
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="block text-[11px] tracking-wide text-graphite mb-1.5">
                          Seção (opcional)
                        </span>
                        <input
                          list="secoes-existentes"
                          value={item.secao ?? ''}
                          onChange={(e) => atualizarItem(idx, { secao: e.target.value })}
                          placeholder="Ex: Quarto, Sala, Cozinha…"
                          className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors"
                        />
                      </div>
                      <Field
                        label="Descrição do item / serviço"
                        value={item.descricao}
                        onChange={(e) => atualizarItem(idx, { descricao: e.target.value })}
                        placeholder="Ex: Instalação de disjuntor trifásico"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <NumberField
                        label="Quantidade"
                        min={0}
                        value={item.quantidade}
                        onChange={(v) => atualizarItem(idx, { quantidade: v })}
                      />
                      <NumberField
                        label="Valor unitário (R$)"
                        min={0}
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
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-line">
                      <span className="text-xs text-graphite">
                        Total do item:{' '}
                        <span className="text-ink font-semibold tabular">
                          {formatarMoeda(
                            totalItem(
                              item,
                              dificuldades.find((d) => d.id === item.dificuldade_id)
                            )
                          )}
                        </span>
                      </span>
                      {itens.length > 1 && (
                        <Button variant="danger" onClick={() => removerItem(idx)}>
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={adicionarItem}
                className="mt-4 text-sm text-brass hover:text-brass-dark font-medium"
              >
                + Adicionar outro item
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
                <NumberField label="Número de técnicos" min={1} value={numTecnicos} onChange={setNumTecnicos} />
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <NumberField
                  label="Desconto (R$, opcional)"
                  min={0}
                  value={desconto}
                  onChange={setDesconto}
                />
                <Field
                  label="Forma de pagamento"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  placeholder="Ex: 50% entrada + 50% na entrega"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <Field
                  label="Prazo de execução"
                  value={prazoExecucao}
                  onChange={(e) => setPrazoExecucao(e.target.value)}
                  placeholder="Ex: 5 dias úteis"
                />
                <Field
                  label="Garantia do serviço"
                  value={garantiaServico}
                  onChange={(e) => setGarantiaServico(e.target.value)}
                  placeholder="Ex: 90 dias"
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
