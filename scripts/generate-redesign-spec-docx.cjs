const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, UnderlineType
} = require('docx');
const fs = require('fs');
const path = require('path');

const BLUE = "1A56DB";
const DARK = "111827";
const GRAY = "6B7280";
const LIGHT_BG = "F3F6FF";
const RED = "DC2626";
const GREEN = "16A34A";
const BORDER_COLOR = "E5E7EB";
const YELLOW_BG = "FFFBEB";
const GREEN_BG = "F0FDF4";
const RED_BG = "FEF2F2";

const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 160 },
    children: [new TextRun({ text, bold: true, size: 36, color: DARK, font: "Arial" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK, font: "Arial" })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: BLUE, font: "Arial" })]
  });
}

function p(text, options = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, color: options.color || DARK, font: "Arial", bold: options.bold || false })]
  });
}

function label(text) {
  return new Paragraph({
    spacing: { before: 160, after: 40 },
    children: [new TextRun({ text: text.toUpperCase(), size: 18, color: GRAY, font: "Arial", bold: true })]
  });
}

function pill(text, color) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: `  ${text}  `, size: 18, color: "FFFFFF", font: "Arial", bold: true, highlight: color === RED ? "red" : color === GREEN ? "green" : "darkBlue" })
    ]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
    children: []
  });
}

function noteBox(text, type = "info") {
  const bg = type === "warning" ? YELLOW_BG : type === "remove" ? RED_BG : LIGHT_BG;
  const accent = type === "warning" ? "D97706" : type === "remove" ? RED : BLUE;
  const prefix = type === "warning" ? "⚠ " : type === "remove" ? "✕  " : "ℹ  ";
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: {
          top: border, bottom: border, right: border,
          left: { style: BorderStyle.SINGLE, size: 12, color: accent }
        },
        shading: { fill: bg, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        children: [new Paragraph({
          children: [new TextRun({ text: prefix + text, size: 20, font: "Arial", color: DARK })]
        })]
      })]
    })]
  });
}

function twoCol(leftParagraphs, rightParagraphs) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4560, 4560],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders,
          width: { size: 4560, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: 0, right: 240 },
          children: leftParagraphs
        }),
        new TableCell({
          borders: noBorders,
          width: { size: 4560, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: 240, right: 0 },
          children: rightParagraphs
        })
      ]
    })]
  });
}

function statusTable(rows) {
  const headerRow = new TableRow({
    children: [
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 2800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "ÁREA", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "STATUS", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 4760, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "AÇÃO", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
    ]
  });
  const dataRows = rows.map(([area, status, acao], i) => {
    const bg = i % 2 === 0 ? "FFFFFF" : "F9FAFB";
    const statusColor = status === "✅ Mantém" ? GREEN : status === "🔴 Remove" ? RED : status === "🔄 Reformula" ? "D97706" : BLUE;
    return new TableRow({
      children: [
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 2800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: area, size: 20, font: "Arial", color: DARK, bold: true })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: status, size: 20, font: "Arial", color: statusColor, bold: true })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 4760, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: acao, size: 20, font: "Arial", color: GRAY })] })] }),
      ]
    });
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 1800, 4760],
    rows: [headerRow, ...dataRows]
  });
}

function navTable(items) {
  const headerRow = new TableRow({
    children: [
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "ROTA", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "LABEL", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 2480, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "PERGUNTA QUE RESPONDE", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 2480, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "ORIGEM", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
    ]
  });
  const dataRows = items.map(([rota, label2, pergunta, origem], i) => {
    const bg = i % 2 === 0 ? "FFFFFF" : "F9FAFB";
    return new TableRow({
      children: [
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: rota, size: 20, font: "Arial", color: BLUE, bold: true })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: label2, size: 20, font: "Arial", color: DARK, bold: true })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 2480, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: pergunta, size: 20, font: "Arial", color: GRAY })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 2480, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: origem, size: 20, font: "Arial", color: GRAY })] })] }),
      ]
    });
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2200, 2200, 2480, 2480],
    rows: [headerRow, ...dataRows]
  });
}

function fieldTable(rows) {
  const headerRow = new TableRow({
    children: [
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 3000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "ELEMENTO", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 1600, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "AÇÃO", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
      new TableCell({ borders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 4760, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "ESPECIFICAÇÃO / LÓGICA", size: 18, bold: true, color: "FFFFFF", font: "Arial" })] })] }),
    ]
  });
  const dataRows = rows.map(([elem, acao, spec], i) => {
    const bg = i % 2 === 0 ? "FFFFFF" : "F9FAFB";
    const acaoColor = acao === "MANTÉM" ? GREEN : acao === "REMOVE" ? RED : acao === "CRIA" ? BLUE : "D97706";
    return new TableRow({
      children: [
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 3000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: elem, size: 20, font: "Arial", color: DARK, bold: true })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 1600, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: acao, size: 18, font: "Arial", color: acaoColor, bold: true })] })] }),
        new TableCell({ borders, shading: { fill: bg, type: ShadingType.CLEAR }, width: { size: 4760, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: spec, size: 20, font: "Arial", color: GRAY })] })] }),
      ]
    });
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 1600, 4760],
    rows: [headerRow, ...dataRows]
  });
}

// ─── DOCUMENT ───────────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [

      // ── CAPA ──
      new Paragraph({ spacing: { before: 1440, after: 80 }, children: [new TextRun({ text: "LT CashFlow", size: 56, bold: true, color: BLUE, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Especificação de Redesign — v2.0", size: 28, color: GRAY, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 0, after: 1200 }, children: [new TextRun({ text: "Maio de 2026  ·  Para implementação no Cursor", size: 22, color: GRAY, font: "Arial" })] }),
      divider(),

      // ── 1. DIAGNÓSTICO ──
      h1("1. Diagnóstico — O que está errado hoje"),
      p("O sistema tem dados corretos e lógica boa. O problema é estrutural: a tela principal acumula três responsabilidades distintas ao mesmo tempo, o que resulta em poluição visual e confusão de navegação."),
      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

      h3("1.1 Problemas identificados por área"),
      statusTable([
        ["Dashboard / Home", "🔄 Reformula", "Mistura visão geral + gestor de mês + extrato. Precisa ser simplificado."],
        ["Sub-abas do dashboard", "🔴 Remove", "Individual, Resumo, Extrato, Lancar, Fatura, Config dentro do dashboard confunde demais."],
        ["Banner 'Primeiro passo'", "🔴 Remove", "Já configurado. Deve sumir permanentemente após setup inicial concluído."],
        ["Tabela de lançamentos", "🔄 Reformula", "1.347 lançamentos paginados no dashboard principal. Pertence à tela de Meses."],
        ["Cartão de crédito no dashboard", "🔄 Reformula", "Bloco completo polui. Vira card compacto clicável que leva à tela Cartão."],
        ["Visão Individual / Hierarquia", "🔴 Remove", "Colunas 'Hierarquia, Pessoa, Papel' não fazem sentido para uso solo."],
        ["Insights", "🔄 Reformula", "Informação boa, mas solta e sem comparação histórica. Vira tela 'Meses'."],
        ["Semana", "✅ Mantém", "Fechamento semanal funciona bem. Não muda nada."],
        ["Reservas", "✅ Mantém", "Fluxo e visualização de poupanças estão ótimos. Não muda nada."],
        ["Cartão (tela própria)", "✅ Mantém", "Resumo do ciclo e movimentações do cartão estão ótimos. Não muda nada."],
      ]),

      new Paragraph({ spacing: { before: 200, after: 40 }, children: [] }),
      noteBox("Regra principal do redesign: cada tela responde UMA pergunta clara. Se uma tela responde duas perguntas, ela precisa ser dividida.", "warning"),

      divider(),

      // ── 2. NOVA ESTRUTURA ──
      h1("2. Nova Estrutura de Navegação"),
      p("A navegação atual tem dois problemas: labels pouco descritivos (Home, Insights) e sub-abas dentro do dashboard que duplicam e fragmentam o acesso. A nova estrutura elimina os dois níveis e organiza por pergunta do usuário."),
      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

      h3("2.1 Mapa de rotas — antes e depois"),
      navTable([
        ["/dashboard (Home)", "→  Início", "Como estou agora?", "Reformulado — limpo e direto"],
        ["/semana", "→  Semana", "Como foi essa semana?", "Mantém — não muda nada"],
        ["/insights", "→  Meses", "Como fui esse mês vs antes?", "Renomeia e reformula"],
        ["/reservas", "→  Reservas", "Como está minha poupança?", "Mantém — não muda nada"],
        ["/cartao", "→  (sem nav direta)", "Detalhes do cartão", "Acessado via card no Início"],
        ["sub-abas do dashboard", "→  REMOVIDO", "—", "Não existe mais"],
      ]),

      new Paragraph({ spacing: { before: 200, after: 40 }, children: [] }),
      noteBox("A aba 'Cartão' sai da nav principal e passa a ser acessada via card clicável no Início. Isso reduz a nav de 6 para 4 itens e mantém o fluxo mais limpo."),

      divider(),

      // ── 3. TELA INÍCIO ──
      h1("3. Tela — Início  (/dashboard)"),
      p("Pergunta que responde: \"Como estou agora?\""),
      p("Objetivo: dar clareza imediata sobre o momento financeiro atual. Sem histórico, sem extrato, sem configuração. Só o essencial para o usuário saber se está bem ou mal."),
      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

      h3("3.1 Especificação dos elementos"),
      fieldTable([
        ["Cabeçalho da página", "MANTÉM", "Nome 'Gestão pessoal Lucas' + data atual. Sem alteração."],
        ["Toggle Semana / Mês / Ano", "MANTÉM", "Filtro de período no canto superior direito. Sem alteração."],
        ["Card: Tenho hoje", "MANTÉM", "Saldo total consolidado. Destaque maior — é o número mais importante."],
        ["Card: Saldo na corrente", "MANTÉM", "Saldo disponível em conta corrente."],
        ["Card: Reservado", "MANTÉM", "Total em reservas/poupanças. Clicável — leva para /reservas."],
        ["Card: Entrou no período", "MANTÉM", "Total de receitas no período selecionado."],
        ["Card: Saiu no período", "MANTÉM", "Total de despesas no período selecionado."],
        ["Card: Sobrou do período", "MANTÉM", "Diferença entre entradas e saídas."],
        ["Linha: Aplicado / Resgatado / Líquido", "MANTÉM", "Resumo de reservas. Mantém a linha discreta como está."],
        ["Card compacto: Cartão de crédito", "REFORMULA", "Mostra apenas: fatura atual + compras do ciclo. Clicável — leva para /cartao. Remove 'Pagamentos do ciclo' (sempre R$ 0,00 polui)."],
        ["Projeção do mês", "CRIA", "Nova linha: 'No ritmo atual, você fecha o mês em ±R$ X'. Lógica: (sobrou até hoje / dias passados) × dias restantes. Exibir só quando período = Mês."],
        ["Banner 'Primeiro passo'", "REMOVE", "Condição: exibir apenas se saldo inicial NÃO foi registrado. Nunca mais aparece após configuração."],
        ["Sub-abas (Individual, Resumo, etc)", "REMOVE", "Não existe mais nesta tela."],
        ["Tabela de lançamentos", "REMOVE", "Não existe mais nesta tela. Pertence à tela Meses."],
        ["Seção 'Visão Individual' e hierarquia", "REMOVE", "Não faz sentido para uso solo. Remove completamente."],
      ]),

      new Paragraph({ spacing: { before: 200, after: 40 }, children: [] }),
      noteBox("A tela Início termina no card do Cartão + linha de Projeção. Ponto final. Sem scroll de extrato, sem tabelas, sem sub-abas."),

      divider(),

      // ── 4. TELA MESES ──
      h1("4. Tela — Meses  (/meses)"),
      p("Pergunta que responde: \"Como fui esse mês, e como compara com antes?\""),
      p("Origem: unifica o que hoje está fragmentado entre Insights e as sub-abas do Dashboard (Resumo, Extrato, Individual). Esta é a tela que mais muda — de inexistente para central."),
      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

      h3("4.1 Bloco 1 — Números do mês"),
      fieldTable([
        ["Receitas (mês)", "MANTÉM", "Vem do Insights atual. Total de entradas no mês selecionado."],
        ["Despesas (mês)", "MANTÉM", "Vem do Insights atual. Total de saídas no mês selecionado."],
        ["Margem sobre receitas (%)", "MANTÉM", "Vem do Insights atual. (receitas - despesas) / receitas × 100."],
        ["Despesa vs mês anterior (%)", "MANTÉM", "Vem do Insights atual. Variação percentual das despesas."],
        ["Seletor de mês", "CRIA", "Dropdown ou setas para navegar entre meses. Padrão: mês atual."],
      ]),

      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),
      h3("4.2 Bloco 2 — Comparativo histórico  (NOVO)"),
      noteBox("Este bloco NÃO EXISTE hoje. É o principal gap do sistema — o usuário não consegue ver evolução entre meses."),
      new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }),
      fieldTable([
        ["Gráfico de barras agrupadas", "CRIA", "Eixo X: últimos 5-6 meses. Eixo Y: valor em R$. Duas barras por mês: Entradas (verde) e Saídas (vermelho). Simples e direto."],
        ["Linha de saldo líquido", "CRIA", "Sobreposta ao gráfico ou separada: linha mostrando saldo líquido mês a mês (entradas - saídas). Deixa claro se está evoluindo."],
        ["Dados necessários", "CRIA", "Backend precisa retornar: por mês { mes, receitas, despesas, saldo_liquido } para os últimos 6 meses."],
      ]),

      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),
      h3("4.3 Bloco 3 — Categorias do mês"),
      fieldTable([
        ["Ranking de categorias", "REFORMULA", "Vem do Dashboard (Gastos por categoria) E do Insights. Escolhe UM lugar — aqui. Remove das outras telas."],
        ["Barra de progresso por categoria", "MANTÉM", "Visual de porcentagem já existe. Mantém."],
        ["Conta x Cartão", "REFORMULA", "Vem do Dashboard atual. Mostra % de gastos por origem (Conta corrente vs Cartão de crédito). Mantém aqui."],
        ["Forma de pagamento", "REFORMULA", "Vem do Dashboard atual (Pix, Crédito, Débito, Transferência). Mantém aqui."],
      ]),

      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),
      h3("4.4 Bloco 4 — Extrato / Movimentações"),
      fieldTable([
        ["Tabela de lançamentos", "MOVE", "Vem do Dashboard atual. Os 1.347 lançamentos ficam aqui, não na tela principal."],
        ["Filtros", "MANTÉM", "Filtro por categoria, tipo, meio e período. Mantém os filtros existentes."],
        ["Paginação", "MANTÉM", "Sistema de páginas atual funciona. Mantém."],
        ["Saldo do dia", "MANTÉM", "A linha de saldo por dia no extrato (ex: Saldo +R$ 713,93) é útil. Mantém."],
      ]),

      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),
      h3("4.5 Bloco 5 — Previsão e revisão"),
      fieldTable([
        ["Previsão simples", "MOVE", "Vem do Insights atual. 'No ritmo atual, despesas chegam a R$ X até fim do mês.' Fica no final desta tela."],
        ["Revisar duplicidades", "MANTÉM", "Vem do Insights atual. Mesma descrição e valor liquidado mais de uma vez. Mantém — é útil."],
      ]),

      divider(),

      // ── 5. TELA SEMANA ──
      h1("5. Tela — Semana  (/semana)"),
      p("Pergunta que responde: \"Como foi essa semana?\""),
      p("Status: não muda nada. Já funciona perfeitamente. Nenhuma alteração necessária."),
      new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }),
      noteBox("✓  Tela congelada — zero alterações.", "info"),

      divider(),

      // ── 6. TELA RESERVAS ──
      h1("6. Tela — Reservas  (/reservas)"),
      p("Pergunta que responde: \"Como está minha poupança?\""),
      p("Status: não muda nada. Visualização de saldo, fluxo geral por período e movimentações por poupança estão excelentes."),
      new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }),
      noteBox("✓  Tela congelada — zero alterações.", "info"),

      divider(),

      // ── 7. TELA CARTÃO ──
      h1("7. Tela — Cartão  (/cartao)"),
      p("Pergunta que responde: \"Como está meu cartão de crédito?\""),
      p("Status: não muda nada na tela em si. A única mudança é de acesso: sai da nav principal e passa a ser acessado via card clicável na tela Início."),
      new Paragraph({ spacing: { before: 80, after: 80 }, children: [] }),
      noteBox("✓  Conteúdo da tela congelado. Muda apenas o ponto de entrada (card no Início, não aba na nav).", "info"),

      divider(),

      // ── 8. LÓGICA DA PROJEÇÃO ──
      h1("8. Lógica — Projeção do mês"),
      p("A projeção aparece na tela Início (linha) e na tela Meses (bloco expandido). Deve ser simples e honesta."),
      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

      h3("8.1 Cálculo"),
      fieldTable([
        ["Variável: dias_passados", "CRIA", "Número de dias corridos desde o início do mês até hoje (incluindo hoje)."],
        ["Variável: dias_no_mes", "CRIA", "Total de dias do mês atual (28, 29, 30 ou 31)."],
        ["Variável: despesas_ate_hoje", "CRIA", "Total de despesas liquidadas no mês até a data de hoje."],
        ["Variável: media_diaria", "CRIA", "despesas_ate_hoje / dias_passados"],
        ["Variável: projecao_fim_mes", "CRIA", "media_diaria × dias_no_mes"],
        ["Variável: saldo_projetado", "CRIA", "receitas_do_mes - projecao_fim_mes"],
        ["Exibição", "CRIA", "Se saldo_projetado > 0: 'Você deve fechar o mês com +R$ X'. Se negativo: 'Atenção: ritmo atual projeta -R$ X no mês.'"],
      ]),

      new Paragraph({ spacing: { before: 200, after: 40 }, children: [] }),
      noteBox("Exibir sempre o aviso: 'Projeção baseada na média diária até hoje. Depende dos próximos lançamentos.' Isso já existe no Insights — manter o mesmo texto.", "warning"),

      divider(),

      // ── 9. O QUE REMOVER ──
      h1("9. Lista Completa de Remoções"),
      p("Elementos a serem removidos do código, não apenas ocultados. Limpeza definitiva."),
      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

      fieldTable([
        ["Banner 'Primeiro passo'", "REMOVE", "Mostrar apenas se saldo inicial não registrado. Após registro: deletar do DOM permanentemente."],
        ["Sub-aba: Individual", "REMOVE", "Não existe mais. A visão 'Lucas / proprietário' não faz sentido solo."],
        ["Sub-aba: Resumo", "REMOVE", "Conteúdo útil (categorias, conta x cartão) move para tela Meses."],
        ["Sub-aba: Extrato", "REMOVE", "Tabela de lançamentos move para tela Meses."],
        ["Sub-aba: Lancar", "REMOVE", "Lançamento já tem fluxo próprio (botão + flutuante). Sub-aba duplica."],
        ["Sub-aba: Fatura", "REMOVE", "Fatura já tem tela própria (/cartao). Sub-aba duplica."],
        ["Sub-aba: Config", "REMOVE", "Config dentro do dashboard de visão mensal não faz sentido. Avaliar mover para settings global."],
        ["Coluna: Hierarquia", "REMOVE", "Na visão individual. Não há hierarquia em uso solo."],
        ["Coluna: Papel", "REMOVE", "Sempre 'proprietário'. Não agrega nada."],
        ["Card: Compras do ciclo", "REMOVE", "No bloco do cartão na Home. Igual à Fatura atual — informação duplicada."],
        ["Card: Pagamentos do ciclo R$ 0,00", "REMOVE", "Sempre zero. Polui. Remove."],
        ["Aba Cartão na nav principal", "REMOVE", "Passa a ser acessada via card clicável na tela Início."],
        ["Seção Insights na nav", "REMOVE", "Renomeia para 'Meses' e reformula conforme seção 4."],
      ]),

      divider(),

      // ── 10. RESUMO ──
      h1("10. Resumo Executivo para o Cursor"),
      p("Passe este resumo como contexto inicial no Cursor antes de começar a implementação."),
      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({
          children: [new TableCell({
            borders: { top: border, bottom: border, right: border, left: { style: BorderStyle.SINGLE, size: 16, color: BLUE } },
            shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            width: { size: 9360, type: WidthType.DXA },
            children: [
              new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "CONTEXTO PARA O CURSOR", size: 18, bold: true, color: BLUE, font: "Arial" })] }),
              new Paragraph({ spacing: { before: 80, after: 60 }, children: [new TextRun({ text: "Sistema: LT CashFlow — gestão financeira pessoal, uso solo (autônomo, renda variável).", size: 20, font: "Arial", color: DARK })] }),
              new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Objetivo do redesign: limpar poluição visual, eliminar duplicidade de informação e reorganizar navegação por pergunta do usuário.", size: 20, font: "Arial", color: DARK })] }),
              new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Telas que NÃO MUDAM: /semana, /reservas, /cartao (conteúdo).", size: 20, font: "Arial", color: GREEN, bold: true })] }),
              new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Telas que MUDAM: /dashboard (Início) — simplifica. /meses (novo) — unifica Insights + sub-abas + extrato.", size: 20, font: "Arial", color: "D97706", bold: true })] }),
              new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Remoções definitivas: banner primeiro passo (condicional), sub-abas do dashboard, visão hierárquica, tabela de lançamentos no dashboard, aba Cartão na nav.", size: 20, font: "Arial", color: RED, bold: true })] }),
              new Paragraph({ spacing: { before: 60, after: 0 }, children: [new TextRun({ text: "Nova funcionalidade: gráfico comparativo de meses (barras agrupadas: entradas vs saídas, últimos 6 meses) + linha de saldo líquido histórico.", size: 20, font: "Arial", color: BLUE, bold: true })] }),
            ]
          })]
        })]
      }),

      new Paragraph({ spacing: { before: 400, after: 80 }, children: [] }),
      new Paragraph({ spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LT CashFlow — Especificação v2.0  ·  Gerado em maio de 2026", size: 18, color: GRAY, font: "Arial" })] }),

    ]
  }]
});

const outDir = path.join(__dirname, '..', 'docs');
const outFile = path.join(outDir, 'LT_CashFlow_Redesign_Spec.docx');
Packer.toBuffer(doc).then((buffer) => {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, buffer);
  console.log('Written', outFile);
});
