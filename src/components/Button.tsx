import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  const variants: Record<string, string> = {
    primary: 'bg-ink text-paper hover:bg-ink-soft',
    secondary: 'bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper',
    ghost: 'bg-transparent text-graphite hover:text-ink',
    danger: 'bg-transparent text-graphite hover:text-red-700',
  }

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
