import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  const variants: Record<string, string> = {
    primary: 'bg-ink text-paper hover:bg-ink-soft',
    secondary: 'bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper',
    ghost: 'bg-transparent text-graphite hover:text-ink',
    danger: 'bg-transparent text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900 hover:bg-red-600 hover:text-white hover:border-red-600',
    'danger-ghost': 'bg-transparent text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10',
  }

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
