import logoIcon from '../assets/logo-icon.png'

export function Marca({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 group"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <img src={logoIcon} alt="Ampher" className="h-7 w-7 object-contain" />
      <div className="h-6 w-px bg-line" />
      <div className="text-left leading-none">
        <div className="font-display font-semibold text-lg tracking-wide text-ink">AMPHER</div>
        <div className="text-[9px] tracking-[0.15em] text-graphite">ENGENHARIA & AUTOMAÇÃO</div>
      </div>
    </button>
  )
}
