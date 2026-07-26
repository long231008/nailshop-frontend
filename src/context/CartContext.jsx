import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'nailshop_cart'

function loadStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && parsed.branchId && Array.isArray(parsed.items)) return parsed
    return null
  } catch {
    return null
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadStoredCart)

  useEffect(() => {
    if (cart && cart.items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [cart])

  // All items in one booking must belong to a single branch (the backend
  // enforces it), so adding from a different branch needs an explicit reset.
  const addItem = (branch, service, { replaceBranch = false } = {}) => {
    if (cart && cart.branchId !== branch.id && !replaceBranch) {
      return 'different-branch'
    }
    const item = {
      serviceId: service.id,
      name: service.name,
      price: service.base_price,
      durationMin: service.duration_min,
    }
    setCart((prev) => {
      if (!prev || prev.branchId !== branch.id) {
        return { branchId: branch.id, branchName: branch.name, items: [item] }
      }
      return { ...prev, items: [...prev.items, item] }
    })
    return 'added'
  }

  const removeItem = (index) => {
    setCart((prev) => {
      if (!prev) return prev
      const items = prev.items.filter((_, i) => i !== index)
      return items.length > 0 ? { ...prev, items } : null
    })
  }

  const clear = () => setCart(null)

  const totals = useMemo(() => {
    const items = cart?.items ?? []
    return {
      count: items.length,
      price: items.reduce((sum, item) => sum + item.price, 0),
      durationMin: items.reduce((sum, item) => sum + item.durationMin, 0),
    }
  }, [cart])

  return (
    <CartContext.Provider value={{ cart, totals, addItem, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
