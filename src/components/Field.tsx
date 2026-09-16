import { useEffect, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

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
 */
export function NumberField({ label, value, onChange, min = 0, placeholder, hint }: NumberFieldProps) {
  const [texto, setTexto] = useState(value === 0 ? '' : String(value))
  const focado = useRef(false)

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
        onFocus={() => {
          focado.current = true
        }}
        onChange={(e) => {
          const limpo = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')
          setTexto(limpo)
          const num = parseFloat(limpo)
          onChange(Number.isNaN(num) ? 0 : Math.max(min, num))
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
      <span className="block text-[11px] tracking-wide text-graphite mb-1.5">{label}</span>
      <div className="relative">
        <select
          className="w-full border-0 border-b border-line bg-transparent py-2 pr-6 text-sm text-ink focus:outline-none focus:border-brass transition-colors"
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

function IconeChevron({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
