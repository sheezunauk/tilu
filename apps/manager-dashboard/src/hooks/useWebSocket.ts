'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { WEBSOCKET_EVENTS } from '@tillu/shared'

interface UseWebSocketProps {
  branchId: string
  role: string
  userId?: string
}

export function useWebSocket({ branchId, role, userId }: UseWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState(0)
  const [realTimeData, setRealTimeData] = useState<any>({})
  const [alerts, setAlerts] = useState<any[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io('http://localhost:8000', {
      transports: ['websocket'],
      autoConnect: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join-branch', { branchId, role, userId })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('connection-established', (data) => {
      console.log('Manager Dashboard WebSocket connected:', data)
    })

    socket.on('branch-joined', (data) => {
      setActiveUsers(data.activeUsers)
    })

    socket.on(WEBSOCKET_EVENTS.BRANCH_METRICS, (data) => {
      setActiveUsers(data.activeUsers)
      setRealTimeData(prev => ({ ...prev, metrics: data }))
    })

    socket.on(WEBSOCKET_EVENTS.ORDER_UPDATED, (data) => {
      setRealTimeData(prev => ({
        ...prev,
        lastOrderUpdate: data,
        totalOrders: (prev.totalOrders || 0) + 1
      }))
    })

    socket.on(WEBSOCKET_EVENTS.KITCHEN_UPDATE, (data) => {
      setRealTimeData(prev => ({
        ...prev,
        kitchenQueue: data.queueLength,
        averageWaitTime: data.averageWaitTime
      }))
    })

    socket.on(WEBSOCKET_EVENTS.INVENTORY_ALERT, (data) => {
      setAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'inventory',
        title: 'Low Stock Alert',
        message: `${data.itemId} running low (${data.currentStock} left)`,
        timestamp: new Date(),
        severity: 'warning'
      }])
    })

    socket.on(WEBSOCKET_EVENTS.SYSTEM_ALERT, (data) => {
      setAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        title: data.title,
        message: data.message,
        timestamp: new Date(),
        severity: data.severity || 'info'
      }])
    })

    socket.on('revenue-update', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        todayRevenue: data.todayRevenue,
        revenueGrowth: data.growth
      }))
    })

    socket.on('performance-metrics', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        performanceMetrics: data
      }))
    })

    return () => {
      socket.emit('leave-branch', { branchId })
      socket.disconnect()
    }
  }, [branchId, role, userId])

  const clearAlert = (alertId: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const clearAllAlerts = () => {
    setAlerts([])
  }

  return {
    isConnected,
    activeUsers,
    realTimeData,
    alerts,
    clearAlert,
    clearAllAlerts,
  }
}
