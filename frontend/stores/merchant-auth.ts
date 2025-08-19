import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MerchantAuthState {
  token: string | null
  merchantId: string | null
  merchantName: string | null
  sessionToken: string | null
  role: 'owner' | 'staff' | null
  rights: Record<string, boolean> | null
  setAuth: (token: string, sessionToken: string, merchantId: string, merchantName: string, role: 'owner' | 'staff', rights: Record<string, boolean>) => void
  logout: () => void
}

export const useMerchantAuth = create<MerchantAuthState>()(
  persist(
    (set) => ({
      token: null,
      merchantId: null,
      merchantName: null,
      sessionToken: null,
      role: null,
      rights: null,
      setAuth: (token, sessionToken, merchantId, merchantName, role, rights) =>
        set({ token, sessionToken, merchantId, merchantName, role, rights }),
      logout: () => set({ token: null, sessionToken: null, merchantId: null, merchantName: null, role: null, rights: null }),
    }),
    {
      name: 'merchant-auth',
    }
  )
)