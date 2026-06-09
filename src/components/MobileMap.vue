<script setup lang="ts">
import { ref, onMounted, watch, inject, type Ref } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as d3 from 'd3'
import { useGridSelectorStore } from '@/store/gridSelector'
import { useNetSelectorStore } from '@/store/netSelector'

// --- Types ---
interface PostalDot {
  name: string
  lon: number
  lat: number
  address?: string
  city?: string
  orgName?: string
  type: 'bank' | 'express'
}

interface GridCell {
  id: string
  row: number
  col: number
  latStart: number
  latEnd: number
  lonStart: number
  lonEnd: number
}

// --- Stores ---
const gridStore = useGridSelectorStore()
const netStore = useNetSelectorStore()

// --- Refs ---
const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let dotSvg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
let dotGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let gridSvg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
let gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let currentDots: PostalDot[] = []
let currentGridCells: GridCell[] = []
const dataSource = ref<'bank' | 'express'>('bank')
const loading = ref(false)

// --- Constants ---
const defaultCenter: [number, number] = [30.659462, 104.065735]  // 成都 (GCJ-02)
const tileUrl = 'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
const TILE_MAX_ZOOM = 17
const TILE_MIN_ZOOM = 5
const GRID_COLOR = '#377eb8'
const GRID_HIGHLIGHT_COLOR = '#e41a1c'
const DOT_COLOR = '#e41a1c'
const DOT_RADIUS_SMALL = 5
const DOT_RADIUS_LARGE = 8

// --- GCJ-02 → WGS-84 ---
const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0
  return ret
}

function transformLon(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0
  return ret
}

function gcj02ToWgs84(lon: number, lat: number): [number, number] {
  const dLat = transformLat(lon - 105.0, lat - 35.0)
  const dLon = transformLon(lon - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  const dLatFinal = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  const dLonFinal = (dLon * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)
  return [lon - dLonFinal, lat - dLatFinal]
}

// --- Load data ---
async function loadData(): Promise<void> {
  loading.value = true
  try {
    const file = dataSource.value === 'bank' ? 'YZ-bank' : 'YZ-express'
    const res = await fetch(`/data/${file}.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw: any[] = await res.json()

    currentDots = raw.map((item: any) => ({
      name: item.name || item.orgName || item.erpName || '',
      lon: item.lon,
      lat: item.lat,
      address: item.address || '',
      city: item.city || '',
      orgName: item.orgName || '',
      type: dataSource.value
    }))
    // 清除旧散点和标签，再渲染新数据
    dotGroup?.selectAll('*').remove()
    renderDots()
  } catch (err) {
    console.error('Failed to load postal data:', err)
    currentDots = []
  } finally {
    loading.value = false
  }
}

// --- Map init ---
function initMap(): void {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: defaultCenter,
    zoom: 11,
    zoomControl: false,
    attributionControl: false
  })

  L.tileLayer(tileUrl, { maxZoom: TILE_MAX_ZOOM, minZoom: TILE_MIN_ZOOM }).addTo(map)

  // D3 SVG for dots
  dotSvg = d3.select(map.getPanes().overlayPane).append('svg')
    .attr('class', 'dot-overlay')
  dotGroup = dotSvg.append('g').attr('class', 'dot-group')

  // D3 SVG for grid
  gridSvg = d3.select(map.getPanes().overlayPane).append('svg')
    .attr('class', 'grid-overlay')
  gridGroup = gridSvg.append('g').attr('class', 'leaflet-zoom-hide grid-group')

  // Redraw dots on zoom/move (grid uses gridBounds positioning, handled by leaflet pane transform)
  map.on('zoomend', () => { renderDots(); renderGrid() })
  map.on('moveend', () => { renderDots(); renderGrid() })
}

// --- D3 scatter dots ---
// 高德瓦片 GCJ-02 + 数据 GCJ-02 → Leaflet WGS-84 投影下偏移互相抵消
function project(lon: number, lat: number): [number, number] {
  if (!map) return [0, 0]
  const point = map.latLngToLayerPoint([lat, lon])
  return [Math.round(point.x), Math.round(point.y)]
}

function renderDots(): void {
  if (!map || !dotSvg || !dotGroup) return

  // Resize SVG to map pane
  const bounds = map.getBounds()
  const topLeft = map.latLngToLayerPoint(bounds.getNorthWest())
  const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast())
  const w = bottomRight.x - topLeft.x
  const h = bottomRight.y - topLeft.y

  dotSvg
    .attr('width', w)
    .attr('height', h)
    .style('left', topLeft.x + 'px')
    .style('top', topLeft.y + 'px')

  dotGroup.attr('transform', `translate(${-topLeft.x},${-topLeft.y})`)

  // Render dots
  const zoom = map.getZoom()
  const radius = zoom < 14 ? DOT_RADIUS_SMALL : DOT_RADIUS_LARGE
  const showLabels = zoom >= 14

  const dots = dotGroup.selectAll<SVGCircleElement, PostalDot>('circle')
    .data(currentDots, (d: PostalDot) => `${d.lon}_${d.lat}_${d.name}`)

  dots.exit().remove()

  const entered = dots.enter()
    .append('circle')
    .attr('fill', DOT_COLOR)
    .attr('fill-opacity', 0.85)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('click', (_event: any, d: PostalDot) => handleDotClick(d))

  dots.merge(entered)
    .attr('cx', (d: PostalDot) => project(d.lon, d.lat)[0])
    .attr('cy', (d: PostalDot) => project(d.lon, d.lat)[1])
    .attr('r', radius)

  // --- Text labels (show when zoomed in) ---
  const labels = dotGroup.selectAll<SVGTextElement, PostalDot>('text')
    .data(showLabels ? currentDots : [], (d: PostalDot) => `${d.lon}_${d.lat}_${d.name}`)

  labels.exit().remove()

  const enteredLabels = labels.enter()
    .append('text')
    .attr('fill', '#000')
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .attr('stroke', '#fff')
    .attr('stroke-width', '2px')
    .attr('paint-order', 'stroke')
    .style('pointer-events', 'none')

  labels.merge(enteredLabels)
    .attr('x', (d: PostalDot) => project(d.lon, d.lat)[0] + radius + 4)
    .attr('y', (d: PostalDot) => project(d.lon, d.lat)[1] + 4)
    .text((d: PostalDot) => {
      const short = d.name.replace('中国邮政集团有限公司', '')
      return short.length > 12 ? short.slice(0, 12) + '...' : short
    })
}

// --- Dot click → select net + generate grid ---
function handleDotClick(dot: PostalDot): void {
  netStore.setSelectedNet({
    name: dot.name,
    address: dot.address || '',
    lon: dot.lon,
    lat: dot.lat
  })
  generateGrid(dot.lat, dot.lon)

  // Fly to dot（保持当前缩放级别）
  if (!map) return
  map.setView([dot.lat, dot.lon], map.getZoom(), { animate: true })
}

// --- Grid bounds (stored for SVG positioning) ---
let gridBounds = { north: 0, south: 0, east: 0, west: 0 }

// --- Grid generation ---
// 与桌面端 map.vue generateGrid() 逻辑完全一致
function generateGrid(centerLat: number, centerLon: number): void {
  if (!map) return

  // 清除旧网格的选中状态
  gridStore.clearGrid()

  const range = netStore.range
  const gridSize = netStore.gridSize

  // 以网点为中心计算边界
  gridBounds = {
    north: centerLat + (range / 2) / 111320,
    south: centerLat - (range / 2) / 111320,
    east: centerLon + (range / 2) / (40075000 * Math.cos(centerLat * PI / 180) / 360),
    west: centerLon - (range / 2) / (40075000 * Math.cos(centerLat * PI / 180) / 360)
  }

  gridStore.setBounds(gridBounds.west, gridBounds.east, gridBounds.north, gridBounds.south)

  const latStep = gridSize / 111320
  const lonStep = gridSize / (40075000 * Math.cos(centerLat * PI / 180) / 360)

  const nRows = Math.round(range / gridSize)
  const nCols = Math.round(range / gridSize)

  currentGridCells = []
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      const south = gridBounds.south + i * latStep
      const west = gridBounds.west + j * lonStep
      currentGridCells.push({
        id: String(i * nCols + j),
        row: i,
        col: j,
        latStart: south,
        latEnd: south + latStep,
        lonStart: west,
        lonEnd: west + lonStep
      })
    }
  }

  renderGrid()
}

function renderGrid(): void {
  if (!map || !gridSvg || !gridGroup) return
  if (currentGridCells.length === 0) {
    gridGroup.selectAll('*').remove()
    return
  }

  // 按网格边界（非地图视野）计算 SVG 位置和尺寸（与桌面端一致）
  const topLeft = map.latLngToLayerPoint([gridBounds.north, gridBounds.west])
  const bottomRight = map.latLngToLayerPoint([gridBounds.south, gridBounds.east])

  gridSvg
    .attr('width', bottomRight.x - topLeft.x)
    .attr('height', bottomRight.y - topLeft.y)
    .style('position', 'absolute')
    .style('left', topLeft.x + 'px')
    .style('top', topLeft.y + 'px')

  // 绘制网格矩形
  const cells = gridGroup.selectAll<SVGRectElement, GridCell>('rect')
    .data(currentGridCells, (d: GridCell) => d.id)

  cells.exit().remove()

  const entered = cells.enter()
    .append('rect')
    .attr('class', 'net-grid-cell')
    .attr('fill', 'none')
    .attr('stroke', GRID_COLOR)
    .attr('stroke-width', 2)
    .style('pointer-events', 'all')
    .on('click', (_event: any, d: GridCell) => handleGridClick(d))

  cells.merge(entered)
    .attr('x', (d: GridCell) =>
      map!.latLngToLayerPoint([d.latStart, d.lonStart]).x - topLeft.x
    )
    .attr('y', (d: GridCell) =>
      map!.latLngToLayerPoint([d.latEnd, d.lonEnd]).y - topLeft.y
    )
    .attr('width', (d: GridCell) => {
      const p1 = map!.latLngToLayerPoint([d.latStart, d.lonStart])
      const p2 = map!.latLngToLayerPoint([d.latEnd, d.lonEnd])
      return p2.x - p1.x
    })
    .attr('height', (d: GridCell) => {
      const p1 = map!.latLngToLayerPoint([d.latStart, d.lonStart])
      const p2 = map!.latLngToLayerPoint([d.latEnd, d.lonEnd])
      return p1.y - p2.y
    })
    .attr('fill', (d: GridCell) =>
      gridStore.grids.has(d.id) ? GRID_HIGHLIGHT_COLOR : 'none'
    )
    .attr('fill-opacity', (d: GridCell) =>
      gridStore.grids.has(d.id) ? 0.3 : 0
    )
}

// --- Grid click ---
function handleGridClick(cell: GridCell): void {
  gridStore.selectGrid(
    cell.id,
    [cell.lonStart, cell.latStart],
    [cell.lonEnd, cell.latEnd]
  )
  renderGrid()
}

// --- Clear grid ---
function clearGrid(): void {
  currentGridCells = []
  gridStore.clearGrid()
  if (gridGroup) gridGroup.selectAll('*').remove()
}

// --- Switch data source ---
function switchDataSource(source: 'bank' | 'express'): void {
  dataSource.value = source
  loadData()
}

// --- Switch city ---
function switchCity(cityName: string, lat?: number, lon?: number): void {
  if (!map) return
  if (lat !== undefined && lon !== undefined) {
    // 直接使用传入坐标（区县级选择）
    const zoom = cityName.length > 2 ? 14 : 11  // 区县级别放大到14
    map.setView([lat, lon], zoom, { animate: true })
    return
  }
  // 按名称查找坐标
  import('@/utils/getCity').then(({ getCity, cities }) => {
    const coords = getCity(cities, cityName)
    if (coords && map) {
      map.setView(coords, 11, { animate: true })
    }
  })
}

// --- Locate current dot ---
function locateDot(): void {
  const net = netStore.selectedNet
  if (!net || !map) return
  map.setView([net.lat, net.lon], 14, { animate: true })
}

// --- Watch grid changes to update highlight ---
watch(() => gridStore.num, () => {
  renderGrid()
})

// --- Watch range/gridSize to regenerate ---
watch([() => netStore.range, () => netStore.gridSize], () => {
  const net = netStore.selectedNet
  if (net && currentGridCells.length > 0) {
    generateGrid(net.lat, net.lon)
  }
})

// --- Lifecycle ---
onMounted(() => {
  initMap()
  loadData()
})

function locateDotByCoord(lat: number, lon: number): void {
  if (!map) return
  map.setView([lat, lon], 15, { animate: true })
}

// --- Expose ---
defineExpose({
  switchDataSource,
  switchCity,
  clearGrid,
  locateDot,
  locateDotByCoord,
  dataSource
})
</script>

<template>
  <div ref="mapContainer" class="mobile-map"></div>
</template>

<style scoped>
.mobile-map {
  width: 100%;
  height: 100%;
}

:global(.dot-overlay),
:global(.grid-overlay) {
  position: absolute;
  pointer-events: none;
  z-index: 400;
}

:global(.dot-overlay circle),
:global(.grid-overlay rect) {
  pointer-events: auto;
}
</style>
