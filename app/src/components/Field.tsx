import { useEffect, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import {
  formatarTelefone,
  formatarValorDigitado,
  numeroParaBufferDigitado,
  valorDigitadoParaNumero,
} from '../lib/formatacao'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function Field({ label, hint, className = '', ...props }: Props) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-wide text-graphite mb-1.5">{label}</span>
      <input
        className={`w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors ${className}`}
        {...props}
      />
      {hint && <span className="block text-[11px] text-graphite/70 mt-1">{hint}</span>}
    </label>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  placeholder?: string
  hint?: string
}

/**
 * Campo numérico próprio, sem usar <input type="number">.
 *
 * O <input type="number"> controlado por React tem um bug clássico:
 * como o valor inicial é 0 (exibido como "0"), ao começar a digitar
 * o novo dígito entra ANTES ou DEPOIS do zero (dependendo do navegador
 * e da posição do cursor), gerando "057,50" em vez de "57,50" — foi
 * esse o "0 na frente" que aparecia nos valores em R$.
 *
 * Aqui o campo é um texto comum: mantemos um buffer local (string) que
 * fica vazio quando o valor é 0, aceitamos vírgula ou ponto como
 * separador decimal, e só convertemos pra número no onChange —
 * sem nunca forçar um "0" de volta pro campo enquanto o usuário digita.
 *
 * Quando `max` é definido, o valor é limitado a ele (ex: campos em R$
 * ficam limitados a 999.999,99) — o campo "trava" no teto ao perder o
 * foco, mesmo que a pessoa tenha digitado mais dígitos que isso.
 */
export function NumberField({ label, value, onChange, min = 0, max, placeholder, hint }: NumberFieldProps) {
  const [texto, setTexto] = useState(value === 0 ? '' : String(value))
  const focado = useRef(false)
  const maxLength = max !== undefined ? String(Math.trunc(max)).length + 3 : undefined

  useEffect(() => {
    if (!focado.current) {
      setTexto(value === 0 ? '' : String(value))
    }
  }, [value])

  return (
    <label className="block">
      <span className="block text-[11px] tracking-wide text-graphite mb-1.5">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={texto}
        placeholder={placeholder ?? '0'}
        maxLength={maxLength}
        onFocus={() => {
          focado.current = true
        }}
        onChange={(e) => {
          const limpo = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')
          setTexto(limpo)
          const num = parseFloat(limpo)
          let novoValor = Number.isNaN(num) ? 0 : Math.max(min, num)
          if (max !== undefined) novoValor = Math.min(max, novoValor)
          onChange(novoValor)
        }}
        onBlur={() => {
          focado.current = false
          setTexto(value === 0 ? '' : String(value))
        }}
        className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors tabular"
      />
      {hint && <span className="block text-[11px] text-graphite/70 mt-1">{hint}</span>}
    </label>
  )
}

interface MoneyFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  max?: number
  placeholder?: string
  hint?: string
}

/**
 * Campo de valor em R$ que formata em tempo real, no padrão brasileiro
 * (separador de milhar "." e 2 casas decimais com ","), enquanto a
 * pessoa digita — sem esperar perder o foco.
 *
 * Ex: ao digitar "2500" o campo já mostra "R$ 2.500,00" na hora.
 * Pra centavos diferentes de zero, basta digitar a vírgula (ex: "2500,9").
 *
 * Assim como o NumberField, quando `max` é definido o valor repassado
 * pro `onChange` é limitado a ele; o campo "trava" no teto exibido ao
 * perder o foco.
 */
export function MoneyField({ label, value, onChange, max, placeholder, hint }: MoneyFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const focado = useRef(false)
  const [texto, setTexto] = useState(() =>
    value === 0 ? '' : formatarValorDigitado(numeroParaBufferDigitado(value))
  )

  useEffect(() => {
    if (!focado.current) {
      setTexto(value === 0 ? '' : formatarValorDigitado(numeroParaBufferDigitado(value)))
    }
  }, [value])

  useEffect(() => {
    if (focado.current && inputRef.current) {
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [texto])

  return (
    <label className="block">
      <span className="block text-[11px] tracking-wide text-graphite mb-1.5">{label}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={texto}
        placeholder={placeholder ?? 'R$ 0,00'}
        onFocus={() => {
          focado.current = true
        }}
        onChange={(e) => {
          if (e.target.value === '') {
            setTexto('')
            onChange(0)
            return
          }
          const formatado = formatarValorDigitado(e.target.value)
          setTexto(formatado)
          let novoValor = valorDigitadoParaNumero(e.target.value)
          if (max !== undefined) novoValor = Math.min(max, novoValor)
          onChange(novoValor)
        }}
        onBlur={() => {
          focado.current = false
          const valorFinal = max !== undefined ? Math.min(max, value) : value
          setTexto(valorFinal === 0 ? '' : formatarValorDigitado(numeroParaBufferDigitado(valorFinal)))
        }}
        className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors tabular"
      />
      {hint && <span className="block text-[11px] text-graphite/70 mt-1">{hint}</span>}
    </label>
  )
}

interface PhoneFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}

/**
 * Campo de telefone: só aceita dígitos (letras e símbolos digitados são
 * descartados) e formata automaticamente no padrão brasileiro —
 * (XX) XXXXX-XXXX pra celular ou (XX) XXXX-XXXX pra fixo — enquanto a
 * pessoa digita.
 */
export function PhoneField({ label, value, onChange, hint }: PhoneFieldProps) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-wide text-graphite mb-1.5">{label}</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={value}
        placeholder="(62) 99999-0000"
        maxLength={15}
        onChange={(e) => onChange(formatarTelefone(e.target.value))}
        className="w-full border-0 border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-graphite/40 focus:outline-none focus:border-brass transition-colors tabular"
      />
      {hint && <span className="block text-[11px] text-graphite/70 mt-1">{hint}</span>}
    </label>
  )
}

export function SelectField({
  label,
  children,
  value,
  onChange,
}: {
  label: string
  children: ReactNode
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      {label && <span className="block text-[11px] tracking-wide text-graphite mb-1.5">{label}</span>}
      <div className="relative">
        <select
          className="w-full border-0 border-b border-line bg-paper py-2 pr-6 text-sm text-ink focus:outline-none focus:border-brass transition-colors [color-scheme:light] dark:[color-scheme:dark]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <IconeChevron className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-graphite" />
      </div>
    </label>
  )
}

interface ToggleFieldProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

/**
 * Toggle (switch) no mesmo tema do app — usado, por exemplo, pra mostrar
 * o campo de observação de um item só quando a pessoa quiser.
 */
export function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <span
        className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-brass' : 'bg-line'
        }`}
      >
        <span
          className={`inline-block h-[22px] w-[22px] translate-x-0.5 rounded-full bg-paper shadow transition-transform ${
            checked ? 'translate-x-[21px]' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="text-[13px] text-graphite group-hover:text-ink transition-colors">{label}</span>
    </button>
  )
}

export function IconeChevron({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
