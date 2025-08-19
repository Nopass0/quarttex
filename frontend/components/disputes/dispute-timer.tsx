'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface DisputeTimerProps {
  createdAt: string
  timeoutMinutes: number
  onExpired?: () => void
  className?: string
}

export function DisputeTimer({ createdAt, timeoutMinutes, onExpired, className }: DisputeTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  const calculateTimeLeft = useCallback(() => {
    const created = new Date(createdAt).getTime()
    const timeout = timeoutMinutes * 60 * 1000 // Convert minutes to milliseconds
    const deadline = created + timeout
    const now = new Date().getTime()
    const remaining = deadline - now

    if (remaining <= 0) {
      if (!isExpired) {
        setIsExpired(true)
        onExpired?.()
      }
      return 0
    }

    return Math.floor(remaining / 1000) // Convert to seconds
  }, [createdAt, timeoutMinutes, isExpired, onExpired])

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
    }

    updateTimer() // Initial update
    const interval = setInterval(updateTimer, 1000) // Update every second

    return () => clearInterval(interval)
  }, [calculateTimeLeft])

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Время истекло'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}ч ${minutes}м ${secs}с`
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`
    } else {
      return `${secs}с`
    }
  }

  const getTimerColor = () => {
    if (timeLeft <= 0) return 'text-red-600 dark:text-red-400'
    if (timeLeft <= 300) return 'text-red-500 dark:text-red-400' // Less than 5 minutes
    if (timeLeft <= 600) return 'text-orange-500 dark:text-orange-400' // Less than 10 minutes
    if (timeLeft <= 900) return 'text-yellow-500 dark:text-yellow-400' // Less than 15 minutes
    return 'text-green-600 dark:text-green-400'
  }

  const getProgressPercentage = () => {
    const totalSeconds = timeoutMinutes * 60
    return Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100))
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        {timeLeft <= 0 ? (
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        ) : (
          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
        <span className={cn('text-sm font-medium', getTimerColor())}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-1000 ease-linear',
            timeLeft <= 0 ? 'bg-red-500' :
            timeLeft <= 300 ? 'bg-red-400' :
            timeLeft <= 600 ? 'bg-orange-400' :
            timeLeft <= 900 ? 'bg-yellow-400' :
            'bg-green-500'
          )}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
    </div>
  )
}

// Компонент для отображения в Badge
export function DisputeTimerBadge({ createdAt, timeoutMinutes, onExpired }: DisputeTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  const calculateTimeLeft = useCallback(() => {
    const created = new Date(createdAt).getTime()
    const timeout = timeoutMinutes * 60 * 1000
    const deadline = created + timeout
    const now = new Date().getTime()
    const remaining = deadline - now

    if (remaining <= 0) {
      if (!isExpired) {
        setIsExpired(true)
        onExpired?.()
      }
      return 0
    }

    return Math.floor(remaining / 1000)
  }, [createdAt, timeoutMinutes, isExpired, onExpired])

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [calculateTimeLeft])

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Истекло'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}ч ${minutes}м`
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`
    } else {
      return `${secs}с`
    }
  }

  const getBadgeVariant = () => {
    if (timeLeft <= 0) return 'destructive'
    if (timeLeft <= 300) return 'destructive'
    if (timeLeft <= 900) return 'secondary'
    return 'default'
  }

  return (
    <Badge variant={getBadgeVariant()} className="gap-1">
      <Clock className="h-3 w-3" />
      {formatTime(timeLeft)}
    </Badge>
  )
}