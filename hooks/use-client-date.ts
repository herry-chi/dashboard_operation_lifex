'use client'

import { useState, useEffect } from 'react'

export function useClientDate() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getToday = () => {
    if (!mounted) return ''
    return new Date().toISOString().split('T')[0]
  }

  const getLastMonday = () => {
    if (!mounted) return ''
    
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1 // If Sunday, go back 6 days to Monday
    const lastMonday = new Date(today.getTime() - (daysToLastMonday + 7) * 24 * 60 * 60 * 1000)
    return lastMonday.toISOString().split('T')[0]
  }

  const getLastSunday = () => {
    if (!mounted) return ''
    
    const today = new Date()
    const currentDay = today.getDay()
    const daysToLastSunday = currentDay === 0 ? 7 : currentDay
    const lastSunday = new Date(today.getTime() - daysToLastSunday * 24 * 60 * 60 * 1000)
    return lastSunday.toISOString().split('T')[0]
  }

  return {
    mounted,
    getToday,
    getLastMonday,
    getLastSunday
  }
}