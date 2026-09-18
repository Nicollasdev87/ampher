import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Dificuldade, OrcamentoCompleto } from './types'
import { totalItem, formatarMoeda } from './calculo'
import logoUrl from '../assets/logo-icon.png'

async function imageToDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const INK: [number, number, number] = [21, 20, 15]
const BRASS: [number, number, number] = [169, 134, 60]
const SAND: [number, number, number] = [239, 230, 210]
const GRAY: [number, number, number] = [110, 108, 100]
const LINE: [number, number, number] = [225, 219, 200]

export async function gerarPdfOrcamento(
  orcamento: OrcamentoCompleto,
  dificuldades: Dificuldade[]
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 42
  let cursorY = 50

  // --- Cabeçalho: logo + nome da empresa ---
  try {
    const logoData = await imageToDataUrl(logoUrl)
    doc.addImage(logoData, 'PNG', margin, cursorY - 18, 22, 22)
  } catch {
    // segue sem logo se por algum motivo não carregar
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...INK)
  doc.text('AMPHER', margin + 30, cursorY - 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('ENGENHARIA & AUTOMAÇÃO', margin + 30, cursorY + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRASS)
  doc.text('ORÇAMENTO', pageWidth - margin, cursorY - 4, { align: 'right' })

  cursorY += 30
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.75)
  doc.line(margin, cursorY, pageWidth - margin, cursorY)

  // --- Número do orçamento ---
  cursorY += 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BRASS)
  doc.text(`ORÇAMENTO Nº ${String(orcamento.numero).padStart(4, '0')}`, margin, cursorY)

  // --- Título / nome do projeto ---
  cursorY += 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...INK)
  const tituloProjeto = orcamento.observacoes?.trim()
    ? orcamento.observacoes
    : `Serviço de ${orcamento.tipo}`
  doc.text(tituloProjeto, margin, cursorY, { maxWidth: pageWidth - margin * 2 })

  // --- Dados do cliente ---
  // Cartão com borda e padding interno próprios (antes o texto e as linhas
  // divisórias iam até a borda da página, sem "respiro" nenhum).
  cursorY += 28
  const dadosCliente: [string, string][] = [
    ['CLIENTE', orcamento.cliente_nome || '-'],
    ['CONTATO', orcamento.cliente_contato || '-'],
    ['LOCAL DO SERVIÇO', orcamento.local_servico || '-'],
    ['DATA', new Date(orcamento.created_at ?? Date.now()).toLocaleDateString('pt-BR')],
    ['VALIDADE DA PROPOSTA', '15 dias corridos'],
  ]

  const padInterno = 14
  const alturaLinha = 18
  const alturaCartao = padInterno * 2 + dadosCliente.length * alturaLinha
  const cartaoTop = cursorY - 8

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.75)
  doc.roundedRect(margin, cartaoTop, pageWidth - margin * 2, alturaCartao, 3, 3)

  let linhaY = cartaoTop + padInterno + 7
  doc.setFontSize(8.5)
  dadosCliente.forEach(([label, valor], idx) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(label, margin + padInterno, linhaY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text(valor, margin + 150, linhaY, {
      maxWidth: pageWidth - margin * 2 - 150 - padInterno,
    })
    if (idx < dadosCliente.length - 1) {
      doc.setDrawColor(...LINE)
      doc.setLineWidth(0.4)
      doc.line(margin + padInterno, linhaY + 11, pageWidth - margin - padInterno, linhaY + 11)
    }
    linhaY += alturaLinha
  })

  cursorY = cartaoTop + alturaCartao + 14

  // --- Seção 01: itens ---
  cursorY += 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...BRASS)
  doc.text('01', margin, cursorY)
  doc.setTextColor(...INK)
  doc.text('ITENS DO ORÇAMENTO', margin + 20, cursorY)

  const mapaDificuldades = new Map(dificuldades.map((d) => [d.id, d]))

  // Agrupa os itens por seção (ex: "Quarto", "Sala"), preservando a ordem
  // em que cada seção apareceu primeiro. Itens sem seção caem em "Geral".
  const secoesMap = new Map<string, typeof orcamento.itens>()
  for (const item of orcamento.itens) {
    const chave = item.secao?.trim() || 'Geral'
    if (!secoesMap.has(chave)) secoesMap.set(chave, [])
    secoesMap.get(chave)!.push(item)
  }
  const temSecoesNomeadas = Array.from(secoesMap.keys()).some((k) => k !== 'Geral')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linhasItens: any[] = []
  let contador = 1
  for (const [secao, itensSecao] of secoesMap) {
    if (temSecoesNomeadas) {
      linhasItens.push([
        {
          content: secao.toUpperCase(),
          colSpan: 5,
          styles: {
            fillColor: SAND,
            textColor: INK,
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
          },
        },
      ])
    }
    for (const item of itensSecao) {
      const dif = item.dificuldade_id ? mapaDificuldades.get(item.dificuldade_id) : undefined
      const valorUnitComRisco = dif ? item.valor_unitario * dif.multiplicador : item.valor_unitario
      const total = totalItem(item, dif)
      const descricaoComObs = item.observacao?.trim()
        ? `${item.descricao}\nObs: ${item.observacao.trim()}`
        : item.descricao
      linhasItens.push([
        String(contador++).padStart(2, '0'),
        descricaoComObs,
        String(item.quantidade),
        formatarMoeda(valorUnitComRisco),
        formatarMoeda(total),
      ])
    }
  }

  autoTable(doc, {
    startY: cursorY + 10,
    margin: { left: margin, right: margin },
    head: [['ITEM', 'DESCRIÇÃO DO SERVIÇO', 'QTD.', 'VALOR UNIT.', 'VALOR TOTAL']],
    body: linhasItens,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: INK,
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
    },
    headStyles: {
      fillColor: INK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 34 },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 75, halign: 'right' },
      4: { cellWidth: 85, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.5, left: 0 }
        data.cell.styles.lineColor = LINE
      }
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorY = (doc as any).lastAutoTable.finalY + 8

  // --- Totais ---
  const totalsX = pageWidth - margin
  const labelX = pageWidth - margin - 160

  function linhaTotal(label: string, valor: string, destaque = false) {
    if (destaque) {
      doc.setFillColor(...SAND)
      doc.rect(labelX - 12, cursorY - 12, 172, 20, 'F')
    }
    doc.setFont('helvetica', destaque ? 'bold' : 'normal')
    doc.setFontSize(destaque ? 10 : 8.5)
    doc.setTextColor(...INK)
    doc.text(label, labelX, cursorY)
    doc.text(valor, totalsX, cursorY, { align: 'right' })
    cursorY += destaque ? 22 : 16
  }

  cursorY += 8
  linhaTotal('Subtotal', formatarMoeda(orcamento.subtotal_itens))
  linhaTotal('Deslocamento', formatarMoeda(orcamento.valor_deslocamento_total))
  linhaTotal('Alimentação', formatarMoeda(orcamento.valor_refeicao_total))
  linhaTotal('Mão de obra técnica', formatarMoeda(orcamento.valor_diaria_tecnicos_total))
  if (orcamento.desconto > 0) {
    linhaTotal('Desconto', `- ${formatarMoeda(orcamento.desconto)}`)
  }
  linhaTotal('Impostos (NFe)', formatarMoeda(orcamento.valor_nfe))
  cursorY += 4
  linhaTotal('TOTAL GERAL', formatarMoeda(orcamento.total_geral), true)

  // --- Seção 02: condições comerciais ---
  cursorY += 18
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...BRASS)
  doc.text('02', margin, cursorY)
  doc.setTextColor(...INK)
  doc.text('CONDIÇÕES COMERCIAIS', margin + 20, cursorY)

  cursorY += 18
  doc.setFontSize(8.5)
  const condicoes = [
    `Forma de pagamento: ${orcamento.forma_pagamento || '-'}`,
    `Prazo de execução: ${orcamento.prazo_execucao || '-'}`,
    `Garantia do serviço: ${orcamento.garantia_servico || '-'}`,
  ]
  for (const linha of condicoes) {
    doc.setTextColor(...BRASS)
    doc.text('—', margin, cursorY)
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'normal')
    doc.text(linha, margin + 12, cursorY)
    cursorY += 16
  }

  cursorY += 8
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(
    'Ao assinar abaixo, o cliente declara estar de acordo com os termos e valores descritos neste orçamento.',
    margin,
    cursorY,
    { maxWidth: pageWidth - margin * 2 }
  )

  // --- Assinaturas ---
  const assinaturaY = Math.max(cursorY + 60, doc.internal.pageSize.getHeight() - 90)
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.75)
  doc.line(margin, assinaturaY, margin + 200, assinaturaY)
  doc.line(pageWidth - margin - 200, assinaturaY, pageWidth - margin, assinaturaY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK)
  doc.text(orcamento.responsavel || 'Ampher Engenharia & Automação', margin, assinaturaY + 14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('Ampher Engenharia & Automação', margin, assinaturaY + 26)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(orcamento.cliente_nome || '-', pageWidth - margin - 200, assinaturaY + 14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('Aceite do cliente — data: ___/___/____', pageWidth - margin - 200, assinaturaY + 26)

  return doc
}

export async function baixarPdfOrcamento(
  orcamento: OrcamentoCompleto,
  dificuldades: Dificuldade[]
) {
  const doc = await gerarPdfOrcamento(orcamento, dificuldades)
  doc.save(`Orcamento-Ampher-${String(orcamento.numero).padStart(4, '0')}.pdf`)
}
