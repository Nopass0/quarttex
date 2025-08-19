import { useEffect, useCallback } from 'react'
import { useTraderAuth } from '@/stores/auth'
import { useTraderStore } from '@/stores/trader'
import { traderApi } from '@/services/api'

export function useTraderFinancials() {
  const token = useTraderAuth((state) => state.token)
  const { financials, setFinancials } = useTraderStore()

  const fetchFinancials = useCallback(async () => {
    if (!token) return
    
    try {
      const response = await traderApi.getProfile()
      
      if (response) {
        const data = response.data || response
        const { trustBalance, profitFromDeals, profitFromPayouts, frozenUsdt, frozenRub, balanceUsdt, balanceRub, deposit, escrowBalance, compensationBalance, referralBalance, disputedBalance } = data
        setFinancials({
          trustBalance: trustBalance || 0,
          profitFromDeals: profitFromDeals || 0,
          profitFromPayouts: profitFromPayouts || 0,
          frozenUsdt: frozenUsdt || 0,
          frozenRub: frozenRub || 0,
          balanceUsdt: balanceUsdt || 0,
          balanceRub: balanceRub || 0,
          deposit: deposit || 0,
          escrowBalance: escrowBalance || 0,
          compensationBalance: compensationBalance || 0,
          referralBalance: referralBalance || 0,
          disputedBalance: disputedBalance || 0,
        })
        // expose rateSource onto window for sidebar to read (quick fix without store shape change)
        if (typeof window !== 'undefined') {
          ;(window as any).__traderRateSource = data.rateSource || 'rapira'
        }
      }
    } catch (error) {
      console.error('Failed to fetch trader financials:', error)
    }
  }, [token, setFinancials])

  useEffect(() => {
    if (!token) return

    fetchFinancials()
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchFinancials, 30000)

    return () => clearInterval(interval)
  }, [token, setFinancials])

  return {
    financials,
    fetchFinancials
  }
}