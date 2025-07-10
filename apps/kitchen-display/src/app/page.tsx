'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@tillu/ui'
import { Clock, User, AlertTriangle, CheckCircle, Play, Pause, Users, Activity, Timer, Zap } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { KitchenAlerts } from '../components/KitchenAlerts'
import { OrderTimer } from '../components/OrderTimer'

interface OrderItem {
  id: string
  name: string
  quantity: number
  modifiers?: string[]
  specialInstructions?: string
}

interface KitchenOrder {
  id: string
  orderNumber: string
  customerName: string
  type: 'dine_in' | 'takeaway' | 'delivery'
  items: OrderItem[]
  priority: number
  estimatedTime: number
  status: 'pending' | 'in_progress' | 'completed'
  assignedChef?: string
  createdAt: Date
  startedAt?: Date
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedBranch, setSelectedBranch] = useState('main-branch')
  const [chefId] = useState('chef-001')

  const {
    isConnected,
    activeUsers,
    kitchenQueue,
    alerts,
    updateOrderStatus,
    requestChefAssignment,
    sendKitchenAlert,
    clearAlert,
    clearAllAlerts,
  } = useWebSocket({
    branchId: selectedBranch,
    role: 'kitchen',
    userId: chefId,
  })

  useEffect(() => {
    const mockOrders: KitchenOrder[] = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        customerName: 'John Smith',
        type: 'takeaway',
        items: [
          { id: '1', name: 'Chicken Tikka Masala', quantity: 1, modifiers: ['Extra Spicy'] },
          { id: '2', name: 'Garlic Naan', quantity: 2 },
        ],
        priority: 3,
        estimatedTime: 25,
        status: 'pending',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        id: '2',
        orderNumber: 'ORD-002',
        customerName: 'Sarah Johnson',
        type: 'delivery',
        items: [
          { id: '3', name: 'Fish & Chips', quantity: 1 },
          { id: '4', name: 'Mango Lassi', quantity: 1 },
        ],
        priority: 2,
        estimatedTime: 20,
        status: 'in_progress',
        assignedChef: 'Chef Mike',
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        startedAt: new Date(Date.now() - 8 * 60 * 1000),
      },
      {
        id: '3',
        orderNumber: 'ORD-003',
        customerName: 'David Wilson',
        type: 'dine_in',
        items: [
          { id: '5', name: 'Vegetable Curry', quantity: 1, specialInstructions: 'No onions' },
          { id: '6', name: 'Basmati Rice', quantity: 1 },
        ],
        priority: 1,
        estimatedTime: 18,
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      },
    ]
    setOrders(mockOrders)

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const getOrderAge = (order: KitchenOrder) => {
    const ageInMinutes = Math.floor((currentTime.getTime() - order.createdAt.getTime()) / (1000 * 60))
    return ageInMinutes
  }

  const getOrderUrgency = (order: KitchenOrder) => {
    const age = getOrderAge(order)
    if (age > 25) return 'critical'
    if (age > 20) return 'urgent'
    if (age > 15) return 'warning'
    return 'normal'
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  const startOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'in_progress', startedAt: new Date(), assignedChef: chefId }
        : order
    ))
    updateOrderStatus(orderId, 'in_progress', chefId)
    sendKitchenAlert(`Order ${orderId} started by chef`, 'info')
  }

  const completeOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'completed' }
        : order
    ))
    updateOrderStatus(orderId, 'completed', chefId)
    sendKitchenAlert(`Order ${orderId} completed`, 'info')
  }

  const requestHelp = (orderId: string) => {
    requestChefAssignment(orderId)
    sendKitchenAlert(`Help requested for order ${orderId}`, 'warning')
  }

  const pendingOrders = orders.filter(order => order.status === 'pending')
  const inProgressOrders = orders.filter(order => order.status === 'in_progress')
  const completedOrders = orders.filter(order => order.status === 'completed')

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Kitchen Command Center</h1>
            <Badge variant={isConnected ? "success" : "destructive"} className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </Badge>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-gray-400">Active Staff: </span>
              <span className="font-semibold text-blue-400">{activeUsers}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Current Time: </span>
              <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{pendingOrders.length}</div>
                <div className="text-xs text-gray-400">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{inProgressOrders.length}</div>
                <div className="text-xs text-gray-400">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{completedOrders.length}</div>
                <div className="text-xs text-gray-400">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <KitchenAlerts 
            isConnected={isConnected}
            alerts={alerts}
            onClearAlert={clearAlert}
            onClearAllAlerts={clearAllAlerts}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-red-400">Pending Orders</h2>
            <div className="space-y-4">
              {pendingOrders.map(order => {
                const urgency = getOrderUrgency(order)
                return (
                  <Card key={order.id} className={`bg-gray-800 border-gray-700 ${
                    urgency === 'urgent' ? 'ring-2 ring-red-500 ring-opacity-50' : ''
                  } ${urgency === 'critical' ? 'ring-2 ring-red-600 animate-pulse' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getUrgencyColor(urgency)} ${
                            urgency === 'urgent' ? 'animate-pulse' : ''
                          }`} />
                          <span className="font-bold text-lg">{order.orderNumber}</span>
                          <Badge variant={order.type === 'delivery' ? 'warning' : 'secondary'}>
                            {order.type.replace('_', ' ')}
                          </Badge>
                          {urgency === 'urgent' && (
                            <Badge variant="destructive" className="animate-pulse">
                              <Zap className="h-3 w-3 mr-1" />
                              URGENT
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Priority: {order.priority}</div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <OrderTimer 
                          createdAt={order.createdAt}
                          estimatedTime={order.estimatedTime}
                          status={order.status}
                          startedAt={order.startedAt}
                        />
                      </div>

                      <div className="mb-3">
                        <div className="font-medium">{order.customerName}</div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {order.items.map(item => (
                          <div key={item.id} className="bg-gray-700 p-2 rounded">
                            <div className="flex justify-between items-start">
                              <span className="font-medium">{item.quantity}x {item.name}</span>
                            </div>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="text-sm text-yellow-400 mt-1">
                                {item.modifiers.join(', ')}
                              </div>
                            )}
                            {item.specialInstructions && (
                              <div className="text-sm text-red-400 mt-1">
                                Note: {item.specialInstructions}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => startOrder(order.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Cooking
                        </Button>
                        <Button 
                          variant="ghost"
                          className="w-full border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-gray-900"
                          onClick={() => requestHelp(order.id)}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Request Help
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">In Progress</h2>
            <div className="space-y-4">
              {inProgressOrders.map(order => {
                const urgency = getOrderUrgency(order)
                return (
                  <Card key={order.id} className={`bg-gray-800 border-gray-700 ${
                    urgency === 'urgent' ? 'ring-2 ring-orange-500 ring-opacity-50' : ''
                  } ${urgency === 'critical' ? 'ring-2 ring-red-600 animate-pulse' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getUrgencyColor(urgency)} animate-pulse`} />
                          <span className="font-bold text-lg">{order.orderNumber}</span>
                          <Badge variant={order.type === 'delivery' ? 'warning' : 'secondary'}>
                            {order.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="warning" className="animate-pulse">
                            <Timer className="h-3 w-3 mr-1" />
                            COOKING
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Priority: {order.priority}</div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <OrderTimer 
                          createdAt={order.createdAt}
                          estimatedTime={order.estimatedTime}
                          status={order.status}
                          startedAt={order.startedAt}
                        />
                      </div>

                      <div className="mb-3">
                        <div className="font-medium">{order.customerName}</div>
                        {order.assignedChef && (
                          <div className="text-sm text-blue-400">Chef: {order.assignedChef}</div>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        {order.items.map(item => (
                          <div key={item.id} className="bg-gray-700 p-2 rounded">
                            <div className="flex justify-between items-start">
                              <span className="font-medium">{item.quantity}x {item.name}</span>
                            </div>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="text-sm text-yellow-400 mt-1">
                                {item.modifiers.join(', ')}
                              </div>
                            )}
                            {item.specialInstructions && (
                              <div className="text-sm text-red-400 mt-1">
                                Note: {item.specialInstructions}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => completeOrder(order.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                        <Button 
                          variant="ghost"
                          className="w-full border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-gray-900"
                          onClick={() => requestHelp(order.id)}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Request Help
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 text-green-400">Completed</h2>
            <div className="space-y-4">
              {completedOrders.map(order => (
                <Card key={order.id} className="bg-gray-800 border-gray-700 opacity-75 border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="font-bold text-lg">{order.orderNumber}</span>
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-green-400">✓ Done</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="font-medium">{order.customerName}</div>
                      {order.assignedChef && (
                        <div className="text-sm text-green-400">Chef: {order.assignedChef}</div>
                      )}
                    </div>

                    <div className="space-y-1">
                      {order.items.map(item => (
                        <div key={item.id} className="text-sm text-gray-400">
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-500">
                        Completed at {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
