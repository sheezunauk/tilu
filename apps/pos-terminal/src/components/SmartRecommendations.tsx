'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, Button, Badge } from '@tillu/ui'
import { Sparkles, TrendingUp, Users, Clock } from 'lucide-react'

interface SmartRecommendation {
  id: string
  type: 'upsell' | 'combo' | 'trending' | 'personalized'
  title: string
  description: string
  items: Array<{
    id: string
    name: string
    price: number
  }>
  savings?: number
  confidence: number
  reason: string
}

interface SmartRecommendationsProps {
  currentOrder: any[]
  onAddRecommendation: (items: any[]) => void
}

export function SmartRecommendations({ currentOrder, onAddRecommendation }: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (currentOrder.length > 0) {
      generateRecommendations()
    } else {
      setRecommendations([])
    }
  }, [currentOrder])

  const generateRecommendations = async () => {
    setIsLoading(true)
    console.log('SmartRecommendations: Generating recommendations for order:', currentOrder)
    try {
      const response = await fetch('http://localhost:8000/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentOrder }),
      })
      
      const data = await response.json()
      console.log('SmartRecommendations: API response:', data)
      
      const apiRecommendations = Array.isArray(data) ? data : (data.recommendations || [])
      
      if (apiRecommendations.length > 0) {
        setRecommendations(apiRecommendations)
      } else {
        console.log('SmartRecommendations: Using mock recommendations')
        setRecommendations(generateMockRecommendations())
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
      setRecommendations(generateMockRecommendations())
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockRecommendations = (): SmartRecommendation[] => {
    const hasMainDish = currentOrder.some(item => 
      item.category === 'mains' || 
      item.name.toLowerCase().includes('curry') || 
      item.name.toLowerCase().includes('masala') ||
      item.name.toLowerCase().includes('fish')
    )
    const hasDrink = currentOrder.some(item => 
      item.category === 'drinks' || 
      item.name.toLowerCase().includes('lassi') ||
      item.name.toLowerCase().includes('chai')
    )
    const hasSide = currentOrder.some(item => 
      item.category === 'sides' ||
      item.name.toLowerCase().includes('naan') ||
      item.name.toLowerCase().includes('rice')
    )

    const recommendations: SmartRecommendation[] = []

    if (hasMainDish && !hasDrink) {
      recommendations.push({
        id: 'drink-combo',
        type: 'combo',
        title: 'Perfect Drink Pairing',
        description: 'Complete your meal with a refreshing drink',
        items: [
          { id: 'mango-lassi', name: 'Mango Lassi', price: 2.95 },
          { id: 'chai-tea', name: 'Masala Chai', price: 2.50 },
        ],
        savings: 0.50,
        confidence: 0.92,
        reason: 'Customers who order curry dishes often add drinks',
      })
    }

    if (hasMainDish && !hasSide) {
      recommendations.push({
        id: 'side-upsell',
        type: 'upsell',
        title: 'Popular Side Addition',
        description: 'Make it a complete meal',
        items: [
          { id: 'garlic-naan', name: 'Garlic Naan', price: 3.50 },
          { id: 'basmati-rice', name: 'Basmati Rice', price: 2.95 },
        ],
        confidence: 0.88,
        reason: 'Perfect complement to your main dish',
      })
    }

    if (currentOrder.length === 0) {
      recommendations.push({
        id: 'trending-combo',
        type: 'trending',
        title: "Today's Most Popular Combo",
        description: 'What other customers are loving today',
        items: [
          { id: 'chicken-tikka', name: 'Chicken Tikka Masala', price: 12.99 },
          { id: 'garlic-naan', name: 'Garlic Naan', price: 3.50 },
          { id: 'mango-lassi', name: 'Mango Lassi', price: 2.95 },
        ],
        savings: 2.44,
        confidence: 0.95,
        reason: 'Ordered by 78% of customers today',
      })
    }

    return recommendations
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'upsell': return <TrendingUp className="h-4 w-4" />
      case 'combo': return <Sparkles className="h-4 w-4" />
      case 'trending': return <Users className="h-4 w-4" />
      case 'personalized': return <Clock className="h-4 w-4" />
      default: return <Sparkles className="h-4 w-4" />
    }
  }

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'upsell': return 'text-green-600'
      case 'combo': return 'text-purple-600'
      case 'trending': return 'text-blue-600'
      case 'personalized': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const handleAddRecommendation = (recommendation: SmartRecommendation) => {
    onAddRecommendation(recommendation.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      category: 'Recommended',
    })))
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
        <Sparkles className="h-4 w-4" />
        <span>Smart Recommendations</span>
      </h3>
      
      {recommendations.map((recommendation) => (
        <Card key={recommendation.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-2">
                <div className={getRecommendationColor(recommendation.type)}>
                  {getRecommendationIcon(recommendation.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{recommendation.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{recommendation.description}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {Math.round(recommendation.confidence * 100)}% match
              </Badge>
            </div>

            <div className="space-y-2 mb-3">
              {recommendation.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">£{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {recommendation.reason}
                {recommendation.savings && (
                  <span className="text-green-600 font-medium ml-2">
                    Save £{recommendation.savings.toFixed(2)}
                  </span>
                )}
              </div>
              <Button 
                size="sm" 
                onClick={() => handleAddRecommendation(recommendation)}
                className="text-xs"
              >
                Add All
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
