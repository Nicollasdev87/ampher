import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Correção de um problema conhecido do Leaflet com bundlers (Vite/Webpack):
// os ícones padrão do marcador são resolvidos por caminho relativo e
// quebram depois do build. Aqui apontamos explicitamente pros arquivos
// já processados pelo Vite.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
})

// Goiânia, GO — mesmo centro usado como exemplo em "Local do serviço"
// em outras telas do app. Só usado quando ainda não há localização marcada.
const CENTRO_PADRAO: [number, number] = [-16.6869, -49.2648]

interface MapaLocalizacaoProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
  className?: string
}

/**
 * Mapa interativo (OpenStreetMap, sem precisar de chave de API nem
 * cadastro) pra marcar a localização de um cliente: clique em qualquer
 * ponto do mapa ou arraste o pino pra ajustar, ou use "Usar minha
 * localização atual" se estiver no local na hora do cadastro.
 */
export function MapaLocalizacao({ latitude, longitude, onChange, className = '' }: MapaLocalizacaoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const marcadorRef = useRef<L.Marker | null>(null)
  // Guardamos o onChange mais recente numa ref pra não precisar recriar
  // os listeners do mapa (e o mapa em si) toda vez que o componente pai
  // renderiza com uma nova função inline.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [obtendoLocal, setObtendoLocal] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapaRef.current) return

    const temPosicaoInicial = latitude !== null && longitude !== null
    const centroInicial: [number, number] = temPosicaoInicial ? [latitude, longitude] : CENTRO_PADRAO

    const mapa = L.map(containerRef.current).setView(centroInicial, temPosicaoInicial ? 16 : 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; colaboradores do OpenStreetMap',
    }).addTo(mapa)

    const marcador = L.marker(centroInicial, { draggable: true }).addTo(mapa)
    marcador.on('dragend', () => {
      const pos = marcador.getLatLng()
      onChangeRef.current(pos.lat, pos.lng)
    })
    mapa.on('click', (e: L.LeafletMouseEvent) => {
      marcador.setLatLng(e.latlng)
      onChangeRef.current(e.latlng.lat, e.latlng.lng)
    })

    mapaRef.current = mapa
    marcadorRef.current = marcador

    // Se o mapa nasce dentro de um container que ainda não tinha tamanho
    // definitivo (ex: dentro de um modal recém-aberto), ele mede errado
    // até algo forçar o recálculo — daí o pequeno delay.
    const timer = setTimeout(() => mapa.invalidateSize(), 150)

    return () => {
      clearTimeout(timer)
      mapa.remove()
      mapaRef.current = null
      marcadorRef.current = null
    }
    // Intencionalmente roda só uma vez (o mapa é criado uma única vez);
    // mudanças de latitude/longitude depois disso são tratadas no efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Se a posição vier de fora (ex: "usar minha localização atual", ou os
  // dados de um cliente diferente carregando), sincroniza o pino e o mapa.
  useEffect(() => {
    if (!mapaRef.current || !marcadorRef.current) return
    if (latitude === null || longitude === null) return
    marcadorRef.current.setLatLng([latitude, longitude])
    mapaRef.current.setView([latitude, longitude], Math.max(mapaRef.current.getZoom(), 15))
  }, [latitude, longitude])

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      setErroLocal('Este navegador não permite obter a localização atual.')
      return
    }
    setObtendoLocal(true)
    setErroLocal(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude)
        setObtendoLocal(false)
      },
      () => {
        setErroLocal('Não foi possível obter a localização — verifique a permissão do navegador.')
        setObtendoLocal(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[11px] tracking-wide text-graphite">Localização no mapa (opcional)</span>
        <button
          type="button"
          onClick={usarLocalizacaoAtual}
          disabled={obtendoLocal}
          className="text-xs text-brass hover:text-brass-dark font-medium disabled:opacity-50 shrink-0"
        >
          {obtendoLocal ? 'Obtendo…' : 'Usar minha localização atual'}
        </button>
      </div>
      <div ref={containerRef} className="w-full h-56 border border-line" />
      {erroLocal && <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5">{erroLocal}</p>}
      {latitude !== null && longitude !== null && (
        <p className="text-[11px] text-graphite/70 mt-1.5">
          {latitude.toFixed(6)}, {longitude.toFixed(6)} — clique ou arraste o pino pra ajustar.{' '}
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-brass hover:text-brass-dark"
          >
            Abrir no Google Maps
          </a>
        </p>
      )}
    </div>
  )
}
