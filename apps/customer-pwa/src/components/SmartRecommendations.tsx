'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, Button, Badge } from '@tillu/ui'
import { Sparkles, TrendingUp, Users, Star } from 'lucide-react'

interface SmartRecommendationsProps {
  currentCart: any[]
  onAddToCart: (item: any) => void
  isConnected: boolean
}

export function SmartRecommendations({ currentCart, onAddToCart, isConnected }: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (currentCart.length > 0 && isConnected) {
      fetchRecommendations()
    }
  }, [currentCart, isConnected])

  const fetchRecommendations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentCart: currentCart.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price
          })),
          context: 'customer_ordering'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected || currentCart.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
        Recommended for You
        {isConnected && (
          <Badge variant="success" className="ml-2 text-xs">
            AI Powered
          </Badge>
        )}
      </h3>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.slice(0, 3).map((rec, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  {rec.type === 'popular' && (
                    <Badge variant="secondary">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  {rec.type === 'pairing' && (
                    <Badge variant="default">
                      <Users className="h-3 w-3 mr-1" />
                      Perfect Pair
                    </Badge>
                  )}
                  {rec.type === 'upsell' && (
                    <Badge variant="warning">
                      <Star className="h-3 w-3 mr-1" />
                      Upgrade
                    </Badge>
                  )}
                </div>
                
                <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                
                {rec.item && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-600">£{rec.item.price?.toFixed(2)}</span>
                    <Button
                      size="sm"
                      onClick={() => onAddToCart(rec.item)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Add
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
