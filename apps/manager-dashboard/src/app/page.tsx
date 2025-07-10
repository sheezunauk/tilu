'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@tillu/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, ShoppingCart, DollarSign, Clock, AlertTriangle, Settings, Download, Brain, Activity } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { RealTimeMetrics } from '../components/RealTimeMetrics'
import { PredictiveAnalytics } from '../components/PredictiveAnalytics'

interface DashboardData {
  todayRevenue: number
  todayOrders: number
  pendingOrders: number
  preparingOrders: number
  averageOrderTime: number
  customerSatisfaction: number
}

export default function ManagerDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    todayRevenue: 1247.50,
    todayOrders: 47,
    pendingOrders: 8,
    preparingOrders: 12,
    averageOrderTime: 18,
    customerSatisfaction: 4.6,
  })

  const [selectedBranch, setSelectedBranch] = useState('all')
  const [timeRange, setTimeRange] = useState('today')
  const [showPredictiveAnalytics, setShowPredictiveAnalytics] = useState(false)

  const {
    isConnected,
    activeUsers,
    realTimeData,
    alerts,
    clearAlert,
    clearAllAlerts,
  } = useWebSocket({
    branchId: selectedBranch === 'all' ? 'all-branches' : selectedBranch.toLowerCase().replace(' ', '-'),
    role: 'manager',
    userId: 'manager-001',
  })

  const salesData = [
    { time: '09:00', revenue: 120, orders: 8 },
    { time: '10:00', revenue: 180, orders: 12 },
    { time: '11:00', revenue: 240, orders: 16 },
    { time: '12:00', revenue: 320, orders: 22 },
    { time: '13:00', revenue: 280, orders: 18 },
    { time: '14:00', revenue: 200, orders: 14 },
    { time: '15:00', revenue: 160, orders: 10 },
    { time: '16:00', revenue: 140, orders: 9 },
    { time: '17:00', revenue: 220, orders: 15 },
    { time: '18:00', revenue: 300, orders: 20 },
  ]

  const popularItems = [
    { name: 'Chicken Tikka Masala', orders: 23, revenue: 299 },
    { name: 'Fish & Chips', orders: 18, revenue: 198 },
    { name: 'Vegetable Curry', orders: 15, revenue: 150 },
    { name: 'Garlic Naan', orders: 32, revenue: 112 },
    { name: 'Mango Lassi', orders: 28, revenue: 83 },
  ]

  const orderStatusData = [
    { name: 'Completed', value: 35, color: '#10b981' },
    { name: 'Preparing', value: 12, color: '#f59e0b' },
    { name: 'Pending', value: 8, color: '#ef4444' },
  ]

  const branches = ['all', 'Main Street', 'High Street', 'City Center']

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {branches.map(branch => (
                  <option key={branch} value={branch}>
                    {branch === 'all' ? 'All Branches' : branch}
                  </option>
                ))}
              </select>
              
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowPredictiveAnalytics(!showPredictiveAnalytics)}
              >
                <Brain className="h-4 w-4 mr-2" />
                {showPredictiveAnalytics ? 'Hide AI' : 'AI Insights'}
              </Button>

              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RealTimeMetrics 
          isConnected={isConnected}
          activeUsers={activeUsers}
          realTimeData={realTimeData}
        />

        {showPredictiveAnalytics && (
          <div className="mb-8">
            <PredictiveAnalytics branchId={selectedBranch} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">£{dashboardData.todayRevenue.toFixed(2)}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12.5% from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Orders Today</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.todayOrders}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+8.2% from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Order Time</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.averageOrderTime}m</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-gray-600">Target: 15m</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Customer Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.customerSatisfaction}/5</p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-green-600">Excellent</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Orders Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} name="Revenue (£)" />
                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {orderStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Popular Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">£{item.revenue}</p>
                      <p className="text-sm text-gray-600">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Live System Alerts</span>
                {alerts.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllAlerts}>
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'bg-red-50 border-l-red-500' :
                      alert.severity === 'warning' ? 'bg-yellow-50 border-l-yellow-500' :
                      'bg-blue-50 border-l-blue-500'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-red-600' :
                            alert.severity === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <div>
                            <h4 className={`font-medium ${
                              alert.severity === 'critical' ? 'text-red-800' :
                              alert.severity === 'warning' ? 'text-yellow-800' :
                              'text-blue-800'
                            }`}>{alert.title}</h4>
                            <p className={`text-sm ${
                              alert.severity === 'critical' ? 'text-red-700' :
                              alert.severity === 'warning' ? 'text-yellow-700' :
                              'text-blue-700'
                            }`}>{alert.message}</p>
                            <p className={`text-xs mt-1 ${
                              alert.severity === 'critical' ? 'text-red-600' :
                              alert.severity === 'warning' ? 'text-yellow-600' :
                              'text-blue-600'
                            }`}>
                              {new Intl.DateTimeFormat('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }).format(alert.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearAlert(alert.id)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Low Stock Alert</h4>
                        <p className="text-sm text-yellow-700">Chicken Breast running low (12 left)</p>
                        <p className="text-xs text-yellow-600 mt-1">2 minutes ago</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800">Order Delay</h4>
                        <p className="text-sm text-red-700">Order #1234 exceeding estimated time</p>
                        <p className="text-xs text-red-600 mt-1">5 minutes ago</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Peak Hour Alert</h4>
                        <p className="text-sm text-blue-700">Lunch rush starting - 15 orders in queue</p>
                        <p className="text-xs text-blue-600 mt-1">Just now</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
