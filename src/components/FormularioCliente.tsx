import { Field, PhoneField } from './Field'
import { MapaLocalizacao } from './MapaLocalizacao'
import { TEXTO_MAXIMO_PADRAO } from '../lib/formatacao'
import type { DadosCliente } from '../lib/cliente-form'

export type { DadosCliente }

/**
 * Campos de cadastro de um cliente: nome, telefones (pode ter mais de
 * um — por isso a lista com "+ Adicionar outro telefone"), endereço em
 * texto e localização marcada no mapa. Usado tanto na tela de Clientes
 * quanto no fluxo de "cadastrar cliente novo" dentro de Criar orçamento,
 * pra não duplicar essa lógica nos dois lugares.
 */
export function FormularioCliente({
  dados,
  onChange,
}: {
  dados: DadosCliente
  onChange: (dados: DadosCliente) => void
}) {
  function atualizarTelefone(idx: number, valor: string) {
    onChange({ ...dados, telefones: dados.telefones.map((t, i) => (i === idx ? valor : t)) })
  }

  function adicionarTelefone() {
    onChange({ ...dados, telefones: [...dados.telefones, ''] })
  }

  function removerTelefone(idx: number) {
    onChange({ ...dados, telefones: dados.telefones.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-6">
      <Field
        label="Nome do cliente / empresa"
        value={dados.nome}
        onChange={(e) => onChange({ ...dados, nome: e.target.value })}
        placeholder="Ex: Indústria Silva Ltda"
        maxLength={TEXTO_MAXIMO_PADRAO}
        autoFocus
      />

      <div>
        <span className="block text-[11px] tracking-wide text-graphite mb-1.5">Telefones</span>
        <div className="space-y-2">
          {dados.telefones.map((tel, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <PhoneField label="" value={tel} onChange={(v) => atualizarTelefone(i, v)} />
              </div>
              {dados.telefones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removerTelefone(i)}
                  className="text-xs text-graphite hover:text-red-500 shrink-0"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={adicionarTelefone}
          className="mt-2 text-xs text-brass hover:text-brass-dark font-medium"
        >
          + Adicionar outro telefone
        </button>
      </div>

      <Field
        label="Endereço"
        value={dados.endereco}
        onChange={(e) => onChange({ ...dados, endereco: e.target.value })}
        placeholder="Ex: Rua X, 123 — Goiânia, GO"
        maxLength={TEXTO_MAXIMO_PADRAO}
      />

      <MapaLocalizacao
        latitude={dados.latitude}
        longitude={dados.longitude}
        onChange={(lat, lng) => onChange({ ...dados, latitude: lat, longitude: lng })}
      />
    </div>
  )
}
