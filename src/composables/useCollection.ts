import { ref, watch } from 'vue'

export interface FavoriteItem {
  id: number
  name: string
  address: string
  hyclass: string
  entityType: string
  addedAt: string
}

export interface FollowUpRecord {
  id: number
  entityId: number
  entityName: string
  entityAddress: string
  text: string
  time: string
}

const FAVORITES_KEY = 'geovis_favorites'
const FOLLOWUPS_KEY = 'geovis_followups'

// --- Load from localStorage ---
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

const favorites = ref<FavoriteItem[]>(loadJSON(FAVORITES_KEY, []))
const followUps = ref<FollowUpRecord[]>(loadJSON(FOLLOWUPS_KEY, []))

// --- Persist ---
watch(favorites, (v) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(v)), { deep: true })
watch(followUps, (v) => localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(v)), { deep: true })

// --- Favorites ---
function isFavorited(entityId: number): boolean {
  return favorites.value.some(f => f.id === entityId)
}

function toggleFavorite(item: { id: number; name: string; address: string; hyclass: string; entityType: string }) {
  const idx = favorites.value.findIndex(f => f.id === item.id)
  if (idx > -1) {
    favorites.value.splice(idx, 1)
  } else {
    favorites.value.push({
      id: item.id,
      name: item.name,
      address: item.address,
      hyclass: item.hyclass,
      entityType: item.entityType,
      addedAt: new Date().toLocaleString('zh-CN')
    })
  }
}

// --- FollowUps ---
function addFollowUp(entityId: number, entityName: string, entityAddress: string, text: string) {
  followUps.value.unshift({
    id: Date.now(),
    entityId,
    entityName,
    entityAddress,
    text: text.trim(),
    time: new Date().toLocaleString('zh-CN')
  })
}

function removeFollowUp(id: number) {
  const idx = followUps.value.findIndex(f => f.id === id)
  if (idx > -1) followUps.value.splice(idx, 1)
}

export function useCollection() {
  return { favorites, followUps, isFavorited, toggleFavorite, addFollowUp, removeFollowUp }
}
