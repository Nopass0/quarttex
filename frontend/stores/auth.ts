import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface TraderAuthState {
  token: string | null
  setToken: (token: string | null) => void
  logout: () => void
  hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

interface AdminAuthState {
  token: string | null
  role: 'SUPER_ADMIN' | 'ADMIN' | null
  setToken: (token: string | null) => void
  setRole: (role: 'SUPER_ADMIN' | 'ADMIN' | null) => void
  logout: () => void
  hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
  isAuthenticated: boolean
  verify: () => Promise<boolean>
  // 2FA fields
  twoFactorVerified: boolean
  setTwoFactorVerified: (verified: boolean) => void
}

export const useTraderAuth = create<TraderAuthState>()(
  persist(
    (set) => ({
      token: null,
      hasHydrated: false,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'trader-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      role: null,
      hasHydrated: false,
      isAuthenticated: false,
      twoFactorVerified: false,
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setRole: (role) => set({ role }),
      logout: () => set({ token: null, role: null, isAuthenticated: false, twoFactorVerified: false }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
      setTwoFactorVerified: (verified) => set({ twoFactorVerified: verified }),
      verify: async () => {
        const token = get().token;
        if (!token) return false;
        
        try {
          const response = await fetch('/api/admin/verify', {
            headers: {
              'x-admin-key': token,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.admin) {
              set({ role: data.admin.role, isAuthenticated: true });
              return true;
            }
          }
          
          set({ token: null, role: null, isAuthenticated: false });
          return false;
        } catch (error) {
          set({ token: null, role: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: 'admin-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
        if (state?.token) {
          state.isAuthenticated = true
        }
      },
    }
  )
)