import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)
const LEGACY_KEY = 'nailshop_cart'

function storageKey(userId) {
  return `nailshop_cart_${userId || 'guest'}`
}

function parseCart(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed) return []
    if (Array.isArray(parsed)) return parsed
    // Very old shape ({branchId, branchName, items}): lift the branch onto items.
    if (parsed.branchId && Array.isArray(parsed.items)) {
      return parsed.items.map((item) => ({
        ...item,
        branchId: parsed.branchId,
        branchName: parsed.branchName,
      }))
    }
    return []
  } catch {
    return []
  }
}

function loadCart(key) {
  const own = parseCart(localStorage.getItem(key))
  // One-time migration of the pre-per-account cart.
  const legacy = parseCart(localStorage.getItem(LEGACY_KEY))
  if (legacy.length > 0) {
    localStorage.removeItem(LEGACY_KEY)
    return [...own, ...legacy]
  }
  return own
}

// One cart per account: each signed-in user keeps their own cart, guests get a
// temporary one that merges into their account cart when they log in.
export function CartProvider({ children }) {
  const { auth } = useAuth()
  const userId = auth?.userId || null

  const keyRef = useRef(storageKey(userId))
  const [items, setItems] = useState(() => loadCart(keyRef.current))

  useEffect(() => {
    const newKey = storageKey(userId)
    if (newKey === keyRef.current) return

    let next = loadCart(newKey)
    if (userId) {
      // Whatever was picked before logging in comes along into the account cart.
      const guest = parseCart(localStorage.getItem(storageKey(null)))
      if (guest.length > 0) {
        next = [...next, ...guest]
        localStorage.removeItem(storageKey(null))
      }
    }
    keyRef.current = newKey
    setItems(next)
  }, [userId])

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(keyRef.current, JSON.stringify(items))
    } else {
      localStorage.removeItem(keyRef.current)
    }
  }, [items])

  const addItem = (branch, service, extra = {}) => {
    setItems((prev) => [
      ...prev,
      {
        branchId: branch.id,
        branchName: branch.name,
        serviceId: service.id,
        name: service.name,
        price: service.base_price,
        durationMin: service.duration_min,
        // extra may carry designId (an accepted custom design and its quote).
        ...extra,
      },
    ])
    return 'added'
  }

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const removeBranchItems = (branchId) => {
    setItems((prev) => prev.filter((item) => item.branchId !== branchId))
  }

  const clear = () => setItems([])

  const totals = useMemo(
    () => ({
      count: items.length,
      price: items.reduce((sum, item) => sum + item.price, 0),
      durationMin: items.reduce((sum, item) => sum + item.durationMin, 0),
    }),
    [items]
  )

  return (
    <CartContext.Provider
      value={{ items, totals, addItem, removeItem, removeBranchItems, clear }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
