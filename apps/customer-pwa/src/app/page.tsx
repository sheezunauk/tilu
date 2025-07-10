'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Badge } from '@tillu/ui'
import { ShoppingCart, MapPin, Clock, Star, Heart, Search, Wifi, WifiOff, User } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { PersonalizedOffers } from '../components/PersonalizedOffers'
import { SmartRecommendations } from '../components/SmartRecommendations'
import { OrderTracking } from '../components/OrderTracking'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
  rating: number
  preparationTime: number
}

interface CartItem extends MenuItem {
  quantity: number
}

export default function CustomerApp() {
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [customerLocation, setCustomerLocation] = useState('London, UK')
  const [customerId] = useState('customer-' + Math.random().toString(36).substr(2, 9))
  const [branchId] = useState('branch-1')
  const [appliedOffers, setAppliedOffers] = useState<string[]>([])

  const {
    isConnected,
    realTimeMenu,
    stockUpdates,
    personalizedOffers,
    orderUpdates,
    trackItemView,
    requestRecommendations,
    placeOrder,
  } = useWebSocket({ customerId, branchId })

  useEffect(() => {
    const mockMenuItems: MenuItem[] = [
      {
        id: '1',
        name: 'Chicken Tikka Masala',
        description: 'Tender chicken in a rich, creamy tomato-based sauce with aromatic spices',
        price: 12.99,
        category: 'mains',
        rating: 4.8,
        preparationTime: 25,
      },
      {
        id: '2',
        name: 'Fish & Chips',
        description: 'Fresh cod in crispy batter served with golden chips and mushy peas',
        price: 10.99,
        category: 'mains',
        rating: 4.6,
        preparationTime: 20,
      },
      {
        id: '3',
        name: 'Garlic Naan',
        description: 'Freshly baked naan bread with garlic and herbs',
        price: 3.50,
        category: 'sides',
        rating: 4.7,
        preparationTime: 10,
      },
      {
        id: '4',
        name: 'Mango Lassi',
        description: 'Refreshing yogurt drink with sweet mango',
        price: 2.95,
        category: 'drinks',
        rating: 4.5,
        preparationTime: 5,
      },
      {
        id: '5',
        name: 'Gulab Jamun',
        description: 'Traditional Indian sweet dumplings in sugar syrup',
        price: 4.50,
        category: 'desserts',
        rating: 4.9,
        preparationTime: 5,
      },
    ]
    setMenuItems(mockMenuItems)
  }, [])

  const categories = ['all', 'mains', 'sides', 'drinks', 'desserts']

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id)
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    
    trackItemView(item.id)
    
    setTimeout(() => {
      requestRecommendations([...cart, { ...item, quantity: 1 }])
    }, 500)
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId))
      return
    }
    setCart(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    )
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const checkout = () => {
    if (cart.length === 0) return
    
    const orderData = {
      items: cart,
      total: getTotalAmount(),
      appliedOffers,
      customerLocation,
      orderType: 'delivery'
    }
    
    placeOrder(orderData)
    alert(`Order placed! Total: £${getTotalAmount().toFixed(2)}`)
    setCart([])
    setAppliedOffers([])
  }

  const applyOffer = (offerId: string) => {
    setAppliedOffers(prev => [...prev, offerId])
  }

  const getItemStock = (itemId: string) => {
    return stockUpdates[itemId] ?? 999
  }

  const isItemAvailable = (itemId: string) => {
    return getItemStock(itemId) > 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Tillu</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Badge variant={isConnected ? "success" : "secondary"} className="flex items-center space-x-1">
                  {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  <span>{isConnected ? 'Live' : 'Offline'}</span>
                </Badge>
                
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Customer</span>
                </div>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                {customerLocation}
              </div>
              
              <div className="relative">
                <Button variant="ghost" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {getTotalItems() > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {getTotalItems()}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Online</h2>
          <p className="text-gray-600">Delicious food delivered to your door</p>
        </div>

        <PersonalizedOffers offers={personalizedOffers} onApplyOffer={applyOffer} />

        <div className="mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "primary" : "secondary"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <SmartRecommendations 
          currentCart={cart} 
          onAddToCart={addToCart} 
          isConnected={isConnected}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                <div className="flex items-center justify-center h-48 bg-gradient-to-br from-blue-50 to-blue-100">
                  <span className="text-blue-600 font-medium">{item.name}</span>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <Button variant="ghost" size="sm" className="p-1">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">{item.rating}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 ml-1">{item.preparationTime} min</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-blue-600">£{item.price.toFixed(2)}</span>
                    {!isItemAvailable(item.id) && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        Out of Stock
                      </Badge>
                    )}
                    {getItemStock(item.id) < 5 && isItemAvailable(item.id) && (
                      <Badge variant="warning" className="text-xs mt-1">
                        Only {getItemStock(item.id)} left
                      </Badge>
                    )}
                  </div>
                  <Button 
                    onClick={() => addToCart(item)}
                    disabled={!isItemAvailable(item.id)}
                    className={!isItemAvailable(item.id) ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {isItemAvailable(item.id) ? 'Add to Cart' : 'Unavailable'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <p className="font-semibold">{getTotalItems()} items in cart</p>
                <p className="text-2xl font-bold text-blue-600">£{getTotalAmount().toFixed(2)}</p>
              </div>
              <Button size="lg" onClick={checkout}>
                Checkout
              </Button>
            </div>
          </div>
        )}

        <OrderTracking orderUpdates={orderUpdates} isConnected={isConnected} />
      </main>
    </div>
  )
}
