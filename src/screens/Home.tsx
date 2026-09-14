export function Home({
  onNovo,
  onBuscar,
}: {
  onNovo: () => void
  onBuscar: () => void
  onConfig: () => void
}) {
  return (
    <main className="min-h-screen flex items-center px-6 sm:px-12">
      <div className="w-full max-w-3xl mx-auto py-12">
        <p className="text-[11px] tracking-[0.15em] text-brass mb-3">GESTÃO DE ORÇAMENTOS</p>
        <h1 className="font-display font-semibold text-4xl sm:text-5xl text-ink leading-[1.05] mb-12 max-w-xl">
          O que você precisa fazer agora?
        </h1>

        <div className="grid sm:grid-cols-2 gap-px bg-line">
          <button
            onClick={onNovo}
            className="bg-paper hover:bg-ink hover:text-paper transition-colors text-left p-8 group"
          >
            <span className="block text-[11px] tracking-wide text-brass mb-4 group-hover:text-brass">
              01
            </span>
            <span className="block font-display font-semibold text-2xl mb-2">
              Criar orçamento
            </span>
            <span className="block text-sm text-graphite group-hover:text-paper/70">
              Monte um orçamento novo, item por item, e gere o PDF pra enviar ao cliente.
            </span>
          </button>

          <button
            onClick={onBuscar}
            className="bg-paper hover:bg-ink hover:text-paper transition-colors text-left p-8 group"
          >
            <span className="block text-[11px] tracking-wide text-brass mb-4">02</span>
            <span className="block font-display font-semibold text-2xl mb-2">
              Verificar orçamento
            </span>
            <span className="block text-sm text-graphite group-hover:text-paper/70">
              Busque um orçamento existente, veja o status, edite ou exclua.
            </span>
          </button>
        </div>
      </div>
    </main>
  )
}
