'use client'

import React, { useState, useEffect } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

interface OrderTimerProps {
  createdAt: Date
  estimatedTime: number
  status: 'pending' | 'in_progress' | 'completed'
  startedAt?: Date
}

export function OrderTimer({ createdAt, estimatedTime, status, startedAt }: OrderTimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const getElapsedTime = () => {
    const referenceTime = status === 'in_progress' && startedAt ? startedAt : createdAt
    return Math.floor((currentTime.getTime() - referenceTime.getTime()) / (1000 * 60))
  }

  const getTotalAge = () => {
    return Math.floor((currentTime.getTime() - createdAt.getTime()) / (1000 * 60))
  }

  const getTimeRemaining = () => {
    if (status === 'completed') return 0
    const elapsed = status === 'in_progress' && startedAt 
      ? Math.floor((currentTime.getTime() - startedAt.getTime()) / (1000 * 60))
      : getTotalAge()
    return Math.max(0, estimatedTime - elapsed)
  }

  const getUrgencyLevel = () => {
    const totalAge = getTotalAge()
    const timeRemaining = getTimeRemaining()
    
    if (totalAge > estimatedTime + 10) return 'critical'
    if (totalAge > estimatedTime + 5) return 'urgent'
    if (timeRemaining <= 2) return 'warning'
    return 'normal'
  }

  const urgency = getUrgencyLevel()
  const elapsedTime = getElapsedTime()
  const timeRemaining = getTimeRemaining()
  const totalAge = getTotalAge()

  const getUrgencyColor = () => {
    switch (urgency) {
      case 'critical': return 'text-red-400'
      case 'urgent': return 'text-orange-400'
      case 'warning': return 'text-yellow-400'
      default: return 'text-green-400'
    }
  }

  const getBackgroundColor = () => {
    switch (urgency) {
      case 'critical': return 'bg-red-500/20'
      case 'urgent': return 'bg-orange-500/20'
      case 'warning': return 'bg-yellow-500/20'
      default: return 'bg-green-500/20'
    }
  }

  return (
    <div className={`p-2 rounded-lg ${getBackgroundColor()} border border-gray-600`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className={`h-4 w-4 ${getUrgencyColor()}`} />
          <span className={`text-sm font-medium ${getUrgencyColor()}`}>
            {status === 'pending' ? 'Waiting' : status === 'in_progress' ? 'Cooking' : 'Done'}
          </span>
        </div>
        {urgency === 'critical' && (
          <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
        )}
      </div>
      
      <div className="mt-1 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Total Age:</span>
          <span className={getUrgencyColor()}>{totalAge}m</span>
        </div>
        
        {status === 'in_progress' && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Cooking:</span>
            <span className={getUrgencyColor()}>{elapsedTime}m</span>
          </div>
        )}
        
        {status !== 'completed' && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Est. Remaining:</span>
            <span className={getUrgencyColor()}>
              {timeRemaining > 0 ? `${timeRemaining}m` : 'OVERDUE'}
            </span>
          </div>
        )}
        
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
          <div 
            className={`h-1.5 rounded-full transition-all duration-1000 ${
              urgency === 'critical' ? 'bg-red-500' :
              urgency === 'urgent' ? 'bg-orange-500' :
              urgency === 'warning' ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ 
              width: `${Math.min(100, (totalAge / estimatedTime) * 100)}%` 
            }}
          />
        </div>
      </div>
    </div>
  )
}
