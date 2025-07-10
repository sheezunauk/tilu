'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Badge } from '@tillu/ui'
import { ShoppingCart, Search, Mic, Users, Settings, BarChart3, Bot, Wifi, WifiOff } from 'lucide-react'
import { offlineSyncService } from '../services/offlineSync';
import { AIAssistant } from '../components/AIAssistant';
import { SmartRecommendations } from '../components/SmartRecommendations';
import { NotificationCenter } from '../components/NotificationCenter';
import { useWebSocket } from '../hooks/useWebSocket';

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  isAvailable: boolean
}

interface OrderItem extends MenuItem {
  quantity: number
}

export default function POSTerminal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [branchId] = useState('branch-1')
  const [userId] = useState('cashier-001')

  const {
    isConnected: isWebSocketConnected,
    activeUsers,
    notifications,
    sendOrderUpdate,
    clearNotification,
    clearAllNotifications,
  } = useWebSocket({
    branchId,
    role: 'cashier',
    userId,
  })

  useEffect(() => {
    const mockMenuItems: MenuItem[] = [
      { id: '1', name: 'Chicken Tikka Masala', price: 12.99, category: 'mains', isAvailable: true },
      { id: '2', name: 'Fish & Chips', price: 10.99, category: 'mains', isAvailable: true },
      { id: '3', name: 'Garlic Naan', price: 3.50, category: 'sides', isAvailable: true },
      { id: '4', name: 'Mango Lassi', price: 2.95, category: 'drinks', isAvailable: true },
      { id: '5', name: 'Gulab Jamun', price: 4.50, category: 'desserts', isAvailable: true },
      { id: '6', name: 'Vegetable Curry', price: 9.99, category: 'mains', isAvailable: true },
    ]
    setMenuItems(mockMenuItems)
  }, [])

  const categories = ['all', 'mains', 'sides', 'drinks', 'desserts']

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory && item.isAvailable
  })

  const addToOrder = (item: MenuItem) => {
    setCurrentOrder(prev => {
      const existing = prev.find(orderItem => orderItem.id === item.id)
      if (existing) {
        return prev.map(orderItem =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const addRecommendationToOrder = (items: Array<{ id: string; name: string; price: number }>) => {
    const newItems = items.map(item => ({
      ...item,
      id: Date.now().toString() + Math.random(),
      category: 'recommendation',
      isAvailable: true,
      quantity: 1,
    }));
    setCurrentOrder(prev => [...prev, ...newItems]);
  }

  const removeFromOrder = (itemId: string) => {
    setCurrentOrder(prev => prev.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(itemId)
      return
    }
    setCurrentOrder(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    )
  }

  const getTotalAmount = () => {
    return currentOrder.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-GB'
    recognition.maxAlternatives = 3

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        const processedTranscript = finalTranscript.toLowerCase().trim()
        
        if (processedTranscript.includes('add') || processedTranscript.includes('order')) {
          const itemMatch = menuItems.find(item => 
            processedTranscript.includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(processedTranscript.replace(/add|order|please|i want|get me/g, '').trim())
          )
          if (itemMatch) {
            addToOrder(itemMatch)
            setSearchQuery('')
          } else {
            setSearchQuery(processedTranscript)
          }
        } else if (processedTranscript.includes('clear') || processedTranscript.includes('reset')) {
          setSearchQuery('')
          setCurrentOrder([])
        } else if (processedTranscript.includes('total') || processedTranscript.includes('amount')) {
          alert(`Current total: £${getTotalAmount().toFixed(2)}`)
        } else {
          setSearchQuery(processedTranscript)
        }
        setIsListening(false)
      } else if (interimTranscript) {
        setSearchQuery(interimTranscript.toLowerCase())
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access and try again.')
      } else if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.')
      } else {
        alert('Speech recognition failed. Please try again.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const processOrder = async () => {
    if (currentOrder.length === 0) return
    
    const orderData = {
      items: currentOrder,
      total: getTotalAmount(),
      timestamp: Date.now(),
      customerInfo: { name: 'Walk-in Customer' },
    }
    
    try {
      if (isOnline) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        })
        
        if (response.ok) {
          const orderData = await response.json()
          sendOrderUpdate(orderData.id || `order-${Date.now()}`, 'confirmed')
          alert(`Order processed online! Total: £${getTotalAmount().toFixed(2)}`)
        } else {
          throw new Error('Online order failed')
        }
      } else {
        await offlineSyncService.saveOfflineOrder(orderData)
        alert(`Order saved offline! Total: £${getTotalAmount().toFixed(2)}`)
        setPendingOrders(prev => prev + 1)
      }
      
      setCurrentOrder([])
    } catch (error) {
      console.error('Order processing failed:', error)
      try {
        await offlineSyncService.saveOfflineOrder(orderData)
        alert(`Order saved offline due to connection issue! Total: £${getTotalAmount().toFixed(2)}`)
        setPendingOrders(prev => prev + 1)
        setCurrentOrder([])
      } catch (offlineError) {
        alert('Failed to process order. Please try again.')
      }
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Tillu POS Terminal</h1>
            <div className="flex items-center space-x-4">
              <Badge variant={isOnline ? "success" : "destructive"} className="flex items-center space-x-1">
                {isWebSocketConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </Badge>
              {activeUsers > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {activeUsers} active users
                </Badge>
              )}
              <Button variant="ghost" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Staff
              </Button>
              <Button variant="ghost" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAIAssistant(true)}
              >
                <Bot className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex">
          <div className="flex-1 p-6">
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={isListening ? "danger" : "secondary"}
                  onClick={startVoiceInput}
                  className="px-3"
                >
                  <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
                </Button>
              </div>

              <div className="flex space-x-2">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2">{item.name}</h3>
                    <p className="text-lg font-bold text-blue-600">£{item.price.toFixed(2)}</p>
                    <Button
                      className="w-full mt-3"
                      size="sm"
                      onClick={() => addToOrder(item)}
                    >
                      Add to Order
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="w-96 bg-white border-l">
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Current Order</h2>
                  <ShoppingCart className="h-5 w-5 text-gray-500" />
                </div>

              <div className="space-y-3 mb-6">
                {currentOrder.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No items in order</p>
                ) : (
                  currentOrder.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-sm text-gray-600">£{item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 p-0"
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeFromOrder(item.id)}
                          className="w-8 h-8 p-0 ml-2"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {currentOrder.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      £{getTotalAmount().toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <Button className="w-full" onClick={processOrder}>
                      Process Order
                    </Button>
                    <Button variant="secondary" className="w-full">
                      Hold Order
                    </Button>
                  </div>
                </div>
              )}
              </div>

              <div>
                <SmartRecommendations
                  currentOrder={currentOrder}
                  onAddRecommendation={addRecommendationToOrder}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AIAssistant 
        isOpen={showAIAssistant} 
        onClose={() => setShowAIAssistant(false)} 
      />

      <NotificationCenter
        notifications={notifications}
        onClearNotification={clearNotification}
        onClearAll={clearAllNotifications}
      />
    </div>
  )
}
