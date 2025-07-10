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
  const [kitchenQueue, setKitchenQueue] = useState<any[]>([])
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
      console.log('Kitchen Display WebSocket connected:', data)
    })

    socket.on('branch-joined', (data) => {
      setActiveUsers(data.activeUsers)
    })

    socket.on(WEBSOCKET_EVENTS.BRANCH_METRICS, (data) => {
      setActiveUsers(data.activeUsers)
    })

    socket.on(WEBSOCKET_EVENTS.ORDER_UPDATED, (data) => {
      setKitchenQueue(prev => {
        const existingIndex = prev.findIndex(order => order.id === data.orderId)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = { ...updated[existingIndex], ...data }
          return updated
        } else {
          return [...prev, data]
        }
      })
    })

    socket.on(WEBSOCKET_EVENTS.KITCHEN_UPDATE, (data) => {
      setKitchenQueue(data.queue || [])
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

    socket.on('urgent-order', (data) => {
      setAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'urgent_order',
        title: 'Urgent Order Alert',
        message: `Order ${data.orderNumber} is overdue!`,
        timestamp: new Date(),
        severity: 'critical'
      }])
    })

    return () => {
      socket.emit('leave-branch', { branchId })
      socket.disconnect()
    }
  }, [branchId, role, userId])

  const updateOrderStatus = (orderId: string, status: string, chefId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('kitchen-order-update', {
        orderId,
        status,
        chefId,
        branchId,
        timestamp: new Date()
      })
    }
  }

  const requestChefAssignment = (orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request-chef-assignment', {
        orderId,
        branchId
      })
    }
  }

  const sendKitchenAlert = (message: string, severity: 'info' | 'warning' | 'critical' = 'info') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('kitchen-alert', {
        message,
        severity,
        branchId,
        timestamp: new Date()
      })
    }
  }

  const clearAlert = (alertId: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const clearAllAlerts = () => {
    setAlerts([])
  }

  return {
    isConnected,
    activeUsers,
    kitchenQueue,
    alerts,
    updateOrderStatus,
    requestChefAssignment,
    sendKitchenAlert,
    clearAlert,
    clearAllAlerts,
  }
}
