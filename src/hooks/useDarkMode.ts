import { useEffect, useState } from 'react'

const CHAVE = 'ampher:tema'

function preferenciaInicial(): boolean {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo) return salvo === 'dark'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function useDarkMode() {
  const [escuro, setEscuro] = useState(preferenciaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro)
    localStorage.setItem(CHAVE, escuro ? 'dark' : 'light')
  }, [escuro])

  return { escuro, alternar: () => setEscuro((v) => !v), setEscuro }
}
