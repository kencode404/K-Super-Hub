import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  DownloadSimple,
  Info,
  ShareNetwork,
  Sparkle,
  TrendUp,
  Wallet,
} from '@phosphor-icons/react'
import type { Session } from '@supabase/supabase-js'
import { createInvestmentProjection, type InvestmentProjection, type ProjectionPoint } from './math'

type CurrencyCode = 'MYR' | 'USD' | 'SGD' | 'EUR' | 'GBP'

const CHART = { width: 900, height: 390, left: 78, right: 22, top: 30, bottom: 54 }
const COLORS = { background: '#0b1020', panel: '#11182b', grid: '#33405f', text: '#eff3ff', muted: '#9ca8c7', mint: '#7cf7c9', violet: '#a994ff' }

function currencyFormatter(currency: CurrencyCode, compact = false) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  })
}

function dateLabel(date: Date, full = false) {
  return new Intl.DateTimeFormat(undefined, full
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { month: 'short', year: 'numeric' }).format(date)
}

function chartGeometry(points: readonly ProjectionPoint[]) {
  const plotWidth = CHART.width - CHART.left - CHART.right
  const plotHeight = CHART.height - CHART.top - CHART.bottom
  const maximum = Math.max(...points.map((point) => point.portfolio), ...points.map((point) => point.invested), 1)
  const yMaximum = maximum * 1.12
  const x = (index: number) => CHART.left + (index / Math.max(1, points.length - 1)) * plotWidth
  const y = (value: number) => CHART.top + plotHeight - (value / yMaximum) * plotHeight
  const path = (key: 'invested' | 'portfolio') => points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(point[key]).toFixed(2)}`)
    .join(' ')
  return { plotWidth, plotHeight, yMaximum, x, y, path }
}

function InvestmentChart({ projection, currency }: { projection: InvestmentProjection; currency: CurrencyCode }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const geometry = useMemo(() => chartGeometry(projection.points), [projection.points])
  const compactMoney = useMemo(() => currencyFormatter(currency, true), [currency])
  const money = useMemo(() => currencyFormatter(currency), [currency])
  const xTickIndexes = useMemo(() => {
    const last = projection.points.length - 1
    return [...new Set(Array.from({ length: 6 }, (_, index) => Math.round((index / 5) * last)))]
  }, [projection.points.length])

  function updateActivePoint(clientX: number, target: SVGSVGElement) {
    const bounds = target.getBoundingClientRect()
    const localX = ((clientX - bounds.left) / bounds.width) * CHART.width
    const ratio = (localX - CHART.left) / geometry.plotWidth
    setActiveIndex(Math.max(0, Math.min(projection.points.length - 1, Math.round(ratio * (projection.points.length - 1)))))
  }

  const activePoint = activeIndex === null ? null : projection.points[activeIndex]

  return (
    <div className="chart-wrap">
      <div className="chart-legend" aria-label="Chart legend">
        <span><i className="legend-line invested" />Total invested principal</span>
        <span><i className="legend-line portfolio" />Total portfolio value</span>
      </div>
      <div className="chart-stage">
        <svg
          className="investment-chart"
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          role="img"
          aria-labelledby="growth-chart-title growth-chart-description"
          onPointerMove={(event) => updateActivePoint(event.clientX, event.currentTarget)}
          onPointerLeave={() => setActiveIndex(null)}
          onPointerDown={(event) => updateActivePoint(event.clientX, event.currentTarget)}
        >
          <title id="growth-chart-title">Projected investment growth</title>
          <desc id="growth-chart-description">A line chart comparing invested principal with projected portfolio value over time.</desc>
          <defs>
            <linearGradient id="portfolio-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.mint} stopOpacity=".2" />
              <stop offset="100%" stopColor={COLORS.mint} stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: 5 }, (_, index) => {
            const value = geometry.yMaximum * (index / 4)
            const y = geometry.y(value)
            return <g key={index}><line className="chart-grid" x1={CHART.left} x2={CHART.width - CHART.right} y1={y} y2={y} /><text className="chart-axis-label" x={CHART.left - 14} y={y + 4} textAnchor="end">{compactMoney.format(value)}</text></g>
          })}
          {xTickIndexes.map((index) => <text className="chart-axis-label" key={index} x={geometry.x(index)} y={CHART.height - 18} textAnchor={index === 0 ? 'start' : index === projection.points.length - 1 ? 'end' : 'middle'}>{dateLabel(projection.points[index].date)}</text>)}
          <path className="chart-area" d={`${geometry.path('portfolio')} L ${geometry.x(projection.points.length - 1)} ${CHART.height - CHART.bottom} L ${CHART.left} ${CHART.height - CHART.bottom} Z`} />
          <path className="chart-line chart-invested" d={geometry.path('invested')} />
          <path className="chart-line chart-portfolio" d={geometry.path('portfolio')} />
          {activePoint && activeIndex !== null && <g className="active-marker">
            <line x1={geometry.x(activeIndex)} x2={geometry.x(activeIndex)} y1={CHART.top} y2={CHART.height - CHART.bottom} />
            <circle className="invested-dot" cx={geometry.x(activeIndex)} cy={geometry.y(activePoint.invested)} r="5" />
            <circle className="portfolio-dot" cx={geometry.x(activeIndex)} cy={geometry.y(activePoint.portfolio)} r="6" />
          </g>}
        </svg>
        {activePoint && activeIndex !== null && <div className={`chart-tooltip ${activeIndex > projection.points.length * .62 ? 'align-left' : ''}`} style={{ left: `${(geometry.x(activeIndex) / CHART.width) * 100}%` }}>
          <strong>{dateLabel(activePoint.date, true)}</strong>
          <span>Portfolio <b>{money.format(activePoint.portfolio)}</b></span>
          <span>Invested <b>{money.format(activePoint.invested)}</b></span>
        </div>}
      </div>
    </div>
  )
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character)
}

async function renderPerformanceSnapshot(node: HTMLElement, projection: InvestmentProjection, currency: CurrencyCode, targetXirr: number, years: number) {
  const width = 1200
  const height = 780
  const geometry = chartGeometry(projection.points)
  const scaleX = (width - 136) / geometry.plotWidth
  const scaleY = 300 / geometry.plotHeight
  const translatePath = (key: 'invested' | 'portfolio') => projection.points.map((point, index) => {
    const x = 68 + (geometry.x(index) - CHART.left) * scaleX
    const y = 674 - (CHART.height - CHART.bottom - geometry.y(point[key])) * scaleY
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
  const money = currencyFormatter(currency)
  const title = node.dataset.snapshotTitle ?? 'Investment growth projection'
  const summary = [
    ['INITIAL VALUE', money.format(projection.points[0].invested)],
    ['MONTHLY', money.format(projection.points[1].invested - projection.points[0].invested)],
    ['FINAL VALUE', money.format(projection.finalValue)],
    ['GROWTH', money.format(projection.totalGrowth)],
  ]
  const summaryCards = summary.map(([label, value], index) => {
    const x = 68 + index * 266
    return `<rect x="${x}" y="175" width="248" height="126" rx="20" fill="#11182b" stroke="#28334d"/><text x="${x + 22}" y="213" class="label">${escapeXml(label)}</text><text x="${x + 22}" y="263" class="value">${escapeXml(value)}</text>`
  }).join('')
  const yGrid = Array.from({ length: 5 }, (_, index) => {
    const y = 674 - index * 75
    const value = geometry.yMaximum * (index / 4)
    return `<line x1="68" x2="1132" y1="${y}" y2="${y}" stroke="#26314b"/><text x="68" y="${y - 10}" class="axis">${escapeXml(currencyFormatter(currency, true).format(value))}</text>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="bg" x1="0" x2="1"><stop stop-color="#080c19"/><stop offset="1" stop-color="#121a32"/></linearGradient></defs>
    <style>.title{font:700 48px system-ui,sans-serif;fill:#eff3ff}.subtitle{font:500 20px system-ui,sans-serif;fill:#9ca8c7}.label{font:700 14px system-ui,sans-serif;letter-spacing:2px;fill:#9ca8c7}.value{font:700 30px system-ui,sans-serif;fill:#eff3ff}.axis{font:500 14px system-ui,sans-serif;fill:#7e8aa9}.footer{font:600 15px system-ui,sans-serif;fill:#9ca8c7}</style>
    <rect width="1200" height="780" fill="url(#bg)"/><circle cx="1080" cy="40" r="210" fill="#a994ff" opacity=".08"/><circle cx="0" cy="740" r="230" fill="#7cf7c9" opacity=".06"/>
    <text x="68" y="82" class="title">${escapeXml(title)}</text><text x="68" y="123" class="subtitle">${targetXirr.toFixed(1)}% target XIRR · ${years} years · ${dateLabel(projection.points[0].date)} to ${dateLabel(projection.points.at(-1)!.date)}</text>
    ${summaryCards}<rect x="44" y="332" width="1112" height="382" rx="26" fill="#0d1426" stroke="#28334d"/>${yGrid}
    <path d="${translatePath('invested')}" fill="none" stroke="#a994ff" stroke-width="6" stroke-linecap="round"/><path d="${translatePath('portfolio')}" fill="none" stroke="#7cf7c9" stroke-width="7" stroke-linecap="round"/>
    <circle cx="72" cy="744" r="6" fill="#a994ff"/><text x="88" y="750" class="footer">Invested principal</text><circle cx="268" cy="744" r="6" fill="#7cf7c9"/><text x="284" y="750" class="footer">Portfolio value</text><text x="1132" y="750" text-anchor="end" class="footer">K-SuperHub</text>
  </svg>`

  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = svgUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas rendering is unavailable.')
    context.drawImage(image, 0, 0)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Snapshot encoding failed.')), 'image/png', 0.96))
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function InvestmentGrowthCalculator({ session, onBack, onSignOut }: { session: Session; onBack: () => void; onSignOut: () => void }) {
  const [initialValue, setInitialValue] = useState(10_000)
  const [monthlyContribution, setMonthlyContribution] = useState(1_000)
  const [targetXirr, setTargetXirr] = useState(8)
  const [years, setYears] = useState(10)
  const [currency, setCurrency] = useState<CurrencyCode>('MYR')
  const [shareState, setShareState] = useState<'idle' | 'rendering' | 'shared' | 'downloaded' | 'error'>('idle')
  const snapshotRef = useRef<HTMLDivElement>(null)
  const projection = useMemo(() => createInvestmentProjection({ initialValue, monthlyContribution, targetXirrPercent: targetXirr, years }), [initialValue, monthlyContribution, targetXirr, years])
  const money = useMemo(() => currencyFormatter(currency), [currency])

  async function shareSnapshot() {
    if (!snapshotRef.current || shareState === 'rendering') return
    setShareState('rendering')
    try {
      const blob = await renderPerformanceSnapshot(snapshotRef.current, projection, currency, targetXirr, years)
      const filename = `investment-growth-${new Date().toISOString().slice(0, 10)}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      const canShareFile = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
      if (canShareFile) {
        await navigator.share({ title: 'My investment growth projection', text: `A ${years}-year projection at a ${targetXirr}% target XIRR.`, files: [file] })
        setShareState('shared')
      } else {
        downloadBlob(blob, filename)
        setShareState('downloaded')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setShareState('idle')
        return
      }
      setShareState('error')
    }
  }

  return (
    <main className="tool-shell">
      <header className="tool-header">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft />Back to hub</button>
        <div className="tool-account"><span>{session.user.email}</span><button type="button" onClick={onSignOut}>Sign out</button></div>
      </header>

      <section className="tool-intro">
        <div><p className="eyebrow">Tools · Investment planning</p><h1>Growth, mapped<br /><span>to the day.</span></h1><p>Set an annual XIRR target and see the terminal value required for every dated cash flow to balance precisely.</p></div>
        <div className="method-chip"><Sparkle /><span><strong>Date-accurate projection</strong><small>Actual calendar dates · 365.2425-day basis</small></span></div>
      </section>

      <section className="calculator-layout">
        <aside className="calculator-controls" aria-labelledby="assumptions-title">
          <div className="control-heading"><div><p className="eyebrow">Your assumptions</p><h2 id="assumptions-title">Build the plan</h2></div><Wallet /></div>
          <label className="field"><span>Initial value</span><div className="money-input"><b>{currency}</b><input type="number" min="0" step="500" inputMode="decimal" value={initialValue} onChange={(event) => setInitialValue(Math.max(0, Number(event.target.value)))} /></div></label>
          <label className="field"><span>Monthly contribution</span><div className="money-input"><b>{currency}</b><input type="number" min="0" step="100" inputMode="decimal" value={monthlyContribution} onChange={(event) => setMonthlyContribution(Math.max(0, Number(event.target.value)))} /></div></label>
          <label className="field range-field"><span><i>Target annual XIRR</i><output>{targetXirr.toFixed(1)}%</output></span><input type="range" min="0" max="30" step="0.1" value={targetXirr} onChange={(event) => setTargetXirr(Number(event.target.value))} /></label>
          <label className="field range-field"><span><i>Investment horizon</i><output>{years} years</output></span><input type="range" min="1" max="40" step="1" value={years} onChange={(event) => setYears(Number(event.target.value))} /></label>
          <label className="field"><span>Display currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>{(['MYR', 'USD', 'SGD', 'EUR', 'GBP'] as const).map((code) => <option key={code}>{code}</option>)}</select></label>
          <div className="calendar-note"><CalendarBlank /><p>Contributions land monthly on today’s calendar day. Short months use their final valid day.</p></div>
        </aside>

        <div className="calculator-results" ref={snapshotRef} data-snapshot-title="Investment growth projection">
          <div className="result-heading"><div><p className="eyebrow">Target outcome</p><h2>{money.format(projection.finalValue)}</h2><p>Projected portfolio value after {years} {years === 1 ? 'year' : 'years'}</p></div><div className="gain-badge"><TrendUp /><span><small>Wealth gain</small><strong>+{money.format(projection.totalGrowth)}</strong></span></div></div>
          <div className="summary-grid">
            <article><small>Initial value</small><strong>{money.format(initialValue)}</strong></article>
            <article><small>Monthly</small><strong>{money.format(monthlyContribution)}</strong></article>
            <article><small>Total invested</small><strong>{money.format(projection.totalInvested)}</strong></article>
            <article><small>Target XIRR</small><strong>{targetXirr.toFixed(1)}%</strong></article>
          </div>
          <InvestmentChart projection={projection} currency={currency} />
          <div className="result-footer">
            <p><Info />XNPV residual: <strong>{Math.abs(projection.npvResidual) < 0.000001 ? '0.000000' : projection.npvResidual.toExponential(2)}</strong></p>
            <button className="share-button" type="button" onClick={() => void shareSnapshot()} disabled={shareState === 'rendering'}>
              {shareState === 'rendering' ? <span className="button-spinner" /> : shareState === 'downloaded' ? <DownloadSimple /> : shareState === 'shared' ? <CheckCircle /> : <ShareNetwork />}
              {shareState === 'rendering' ? 'Rendering image…' : shareState === 'downloaded' ? 'Image downloaded' : shareState === 'shared' ? 'Shared' : 'Share performance chart'}
            </button>
          </div>
          {shareState === 'error' && <p className="share-error" role="alert">The snapshot could not be created. Please try again.</p>}
        </div>
      </section>
    </main>
  )
}
