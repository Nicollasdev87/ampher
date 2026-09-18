export interface DadosCliente {
  nome: string
  telefones: string[]
  endereco: string
  latitude: number | null
  longitude: number | null
}

export const DADOS_CLIENTE_VAZIOS: DadosCliente = {
  nome: '',
  telefones: [''],
  endereco: '',
  latitude: null,
  longitude: null,
}
