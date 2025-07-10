'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { WEBSOCKET_EVENTS } from '@tillu/shared'

interface UseWebSocketProps {
  customerId?: string
  branchId?: string
}

export function useWebSocket({ customerId, branchId }: UseWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [realTimeMenu, setRealTimeMenu] = useState<any[]>([])
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({})
  const [personalizedOffers, setPersonalizedOffers] = useState<any[]>([])
  const [orderUpdates, setOrderUpdates] = useState<any[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io('http://localhost:8000', {
      transports: ['websocket'],
      autoConnect: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join-customer', { customerId, branchId })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('connection-established', (data) => {
      console.log('Customer PWA WebSocket connected:', data)
    })

    socket.on('menu-updated', (data) => {
      setRealTimeMenu(data.menu || [])
    })

    socket.on(WEBSOCKET_EVENTS.INVENTORY_ALERT, (data) => {
      setStockUpdates(prev => ({
        ...prev,
        [data.itemId]: data.currentStock
      }))
    })

    socket.on('personalized-offers', (data) => {
      setPersonalizedOffers(data.offers || [])
    })

    socket.on(WEBSOCKET_EVENTS.ORDER_UPDATED, (data) => {
      if (data.customerId === customerId) {
        setOrderUpdates(prev => [...prev, data])
      }
    })

    socket.on('flash-deal', (data) => {
      setPersonalizedOffers(prev => [...prev, {
        id: Date.now(),
        type: 'flash_deal',
        title: 'Flash Deal!',
        description: data.description,
        discount: data.discount,
        validUntil: data.validUntil,
        itemIds: data.itemIds
      }])
    })

    socket.on('loyalty-update', (data) => {
      if (data.customerId === customerId) {
        console.log('Loyalty points updated:', data)
      }
    })

    return () => {
      socket.emit('leave-customer', { customerId })
      socket.disconnect()
    }
  }, [customerId, branchId])

  const trackItemView = (itemId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('track-item-view', {
        customerId,
        itemId,
        timestamp: new Date()
      })
    }
  }

  const requestRecommendations = (currentCart: any[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request-recommendations', {
        customerId,
        currentCart,
        branchId
      })
    }
  }

  const placeOrder = (orderData: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('place-order', {
        ...orderData,
        customerId,
        branchId,
        timestamp: new Date()
      })
    }
  }

  return {
    isConnected,
    realTimeMenu,
    stockUpdates,
    personalizedOffers,
    orderUpdates,
    trackItemView,
    requestRecommendations,
    placeOrder,
  }
}
