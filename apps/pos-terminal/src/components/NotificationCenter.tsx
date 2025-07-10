'use client'

import React from 'react'
import { Button, Card, CardContent, Badge } from '@tillu/ui'
import { Bell, X, AlertTriangle, Info, CheckCircle, Zap } from 'lucide-react'

interface Notification {
  id: number
  type: 'order_update' | 'kitchen_update' | 'inventory_alert' | 'staff_notification' | 'flash_offer'
  message: string
  timestamp: Date
  data?: any
}

interface NotificationCenterProps {
  notifications: Notification[]
  onClearNotification: (id: number) => void
  onClearAll: () => void
}

export function NotificationCenter({ notifications, onClearNotification, onClearAll }: NotificationCenterProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_update':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'kitchen_update':
        return <Info className="h-4 w-4 text-blue-600" />
      case 'inventory_alert':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'flash_offer':
        return <Zap className="h-4 w-4 text-yellow-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_update':
        return 'border-l-green-500 bg-green-50'
      case 'kitchen_update':
        return 'border-l-blue-500 bg-blue-50'
      case 'inventory_alert':
        return 'border-l-red-500 bg-red-50'
      case 'flash_offer':
        return 'border-l-yellow-500 bg-yellow-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp)
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-20 right-4 w-80 max-h-96 overflow-y-auto z-40">
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span className="font-semibold text-sm">Notifications</span>
              <Badge variant="secondary" className="text-xs">
                {notifications.length}
              </Badge>
            </div>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-xs h-6 px-2"
              >
                Clear All
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border-l-4 ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onClearNotification(notification.id)}
                    className="h-6 w-6 p-0 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {notifications.length > 5 && (
            <div className="mt-2 text-center">
              <span className="text-xs text-gray-500">
                +{notifications.length - 5} more notifications
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
