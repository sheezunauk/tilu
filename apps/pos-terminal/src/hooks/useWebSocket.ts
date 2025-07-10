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
  const [notifications, setNotifications] = useState<any[]>([])
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
      console.log('WebSocket connection established:', data)
    })

    socket.on('branch-joined', (data) => {
      setActiveUsers(data.activeUsers)
    })

    socket.on(WEBSOCKET_EVENTS.BRANCH_METRICS, (data) => {
      setActiveUsers(data.activeUsers)
    })

    socket.on(WEBSOCKET_EVENTS.ORDER_UPDATED, (data) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'order_update',
        message: `Order ${data.orderId} status: ${data.status}`,
        timestamp: new Date(data.timestamp),
        data
      }])
    })

    socket.on(WEBSOCKET_EVENTS.KITCHEN_UPDATE, (data) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'kitchen_update',
        message: 'Kitchen queue updated',
        timestamp: new Date(data.timestamp),
        data
      }])
    })

    socket.on(WEBSOCKET_EVENTS.INVENTORY_ALERT, (data) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'inventory_alert',
        message: `Low stock alert: ${data.itemId}`,
        timestamp: new Date(data.timestamp),
        data
      }])
    })

    socket.on(WEBSOCKET_EVENTS.STAFF_NOTIFICATION, (data) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'staff_notification',
        message: data.message,
        timestamp: new Date(data.timestamp),
        data
      }])
    })

    socket.on(WEBSOCKET_EVENTS.FLASH_OFFER, (data) => {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'flash_offer',
        message: `Flash offer: ${data.title}`,
        timestamp: new Date(data.timestamp),
        data
      }])
    })

    return () => {
      socket.emit('leave-branch', { branchId })
      socket.disconnect()
    }
  }, [branchId, role, userId])

  const sendOrderUpdate = (orderId: string, status: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('order-status-update', {
        orderId,
        status,
        branchId
      })
    }
  }

  const sendKitchenUpdate = (queueData: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('kitchen-queue-update', {
        queueData,
        branchId
      })
    }
  }

  const sendInventoryAlert = (itemId: string, currentStock: number, minimumStock: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('inventory-alert', {
        itemId,
        currentStock,
        minimumStock,
        branchId
      })
    }
  }

  const sendStaffMessage = (message: string, targetRole?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('staff-message', {
        message,
        targetRole,
        branchId
      })
    }
  }

  const clearNotification = (notificationId: number) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  return {
    isConnected,
    activeUsers,
    notifications,
    sendOrderUpdate,
    sendKitchenUpdate,
    sendInventoryAlert,
    sendStaffMessage,
    clearNotification,
    clearAllNotifications,
  }
}
