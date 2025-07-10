'use client'

import React from 'react'
import { Card, CardContent, Badge } from '@tillu/ui'
import { Clock, CheckCircle, Truck, ChefHat, Package } from 'lucide-react'

interface OrderTrackingProps {
  orderUpdates: any[]
  isConnected: boolean
}

export function OrderTracking({ orderUpdates, isConnected }: OrderTrackingProps) {
  if (orderUpdates.length === 0) return null

  const latestOrder = orderUpdates[orderUpdates.length - 1]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'preparing': return <ChefHat className="h-4 w-4 text-yellow-500" />
      case 'ready': return <Package className="h-4 w-4 text-blue-500" />
      case 'out_for_delivery': return <Truck className="h-4 w-4 text-purple-500" />
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success'
      case 'preparing': return 'warning'
      case 'ready': return 'primary'
      case 'out_for_delivery': return 'secondary'
      case 'delivered': return 'success'
      default: return 'secondary'
    }
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-80">
      <Card className="border-l-4 border-l-blue-500 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Order Tracking</h4>
            <Badge variant={isConnected ? "success" : "secondary"}>
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Order #{latestOrder.orderNumber}</span>
              <span className="text-xs text-gray-500">
                {new Date(latestOrder.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusIcon(latestOrder.status)}
              <Badge variant={getStatusColor(latestOrder.status) as any}>
                {latestOrder.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            {latestOrder.estimatedTime && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-3 w-3" />
                <span>Est. {latestOrder.estimatedTime} minutes</span>
              </div>
            )}
            
            {latestOrder.message && (
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                {latestOrder.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
