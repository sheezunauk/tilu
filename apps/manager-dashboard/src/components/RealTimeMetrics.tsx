'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@tillu/ui'
import { Activity, Users, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react'

interface RealTimeMetricsProps {
  isConnected: boolean
  activeUsers: number
  realTimeData: any
}

export function RealTimeMetrics({ isConnected, activeUsers, realTimeData }: RealTimeMetricsProps) {
  const metrics = [
    {
      title: 'Live Orders',
      value: realTimeData.totalOrders || 47,
      change: '+3 in last hour',
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Staff',
      value: activeUsers,
      change: 'Across all branches',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Kitchen Queue',
      value: realTimeData.kitchenQueue || 8,
      change: `${realTimeData.averageWaitTime || 18}m avg wait`,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Revenue Rate',
      value: '£127/hr',
      change: realTimeData.revenueGrowth || '+12.5%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Real-Time Metrics</h2>
        <Badge variant={isConnected ? "success" : "destructive"} className="flex items-center space-x-1">
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
                <div className={`h-10 w-10 ${metric.bgColor} rounded-full flex items-center justify-center`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">{metric.change}</span>
              </div>
              {isConnected && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {realTimeData.lastOrderUpdate && (
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-800">Latest Order Update</h4>
                <p className="text-sm text-green-700">
                  Order #{realTimeData.lastOrderUpdate.orderId} - {realTimeData.lastOrderUpdate.status}
                </p>
              </div>
              <Badge variant="success">Live</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
