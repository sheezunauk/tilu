'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@tillu/ui'
import { TrendingUp, Calendar, AlertTriangle, Target } from 'lucide-react'

interface ForecastData {
  revenue: Array<{
    date: string
    predicted: number
    confidence: number
  }>
  inventory: Array<{
    item: string
    currentStock: number
    predictedDepletion: string
    reorderRecommendation: number
  }>
  staffing: Array<{
    date: string
    shift: string
    recommendedStaff: number
    expectedOrders: number
  }>
}

interface PredictiveAnalyticsProps {
  branchId: string
}

export function PredictiveAnalytics({ branchId }: PredictiveAnalyticsProps) {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null)
  const [selectedView, setSelectedView] = useState<'revenue' | 'inventory' | 'staffing'>('revenue')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchForecastData = async () => {
      try {
        const response = await fetch(`/api/forecasting/${branchId === 'all' ? 'all-branches' : branchId}`)
        const data = await response.json()
        setForecastData(data)
      } catch (error) {
        console.error('Failed to fetch forecast data:', error)
        setForecastData({
          revenue: [
            { date: '2025-07-11', predicted: 1250, confidence: 0.87 },
            { date: '2025-07-12', predicted: 1450, confidence: 0.82 },
            { date: '2025-07-13', predicted: 1680, confidence: 0.79 },
            { date: '2025-07-14', predicted: 1320, confidence: 0.85 },
          ],
          inventory: [
            { item: 'Chicken Breast', currentStock: 15, predictedDepletion: '2025-07-12', reorderRecommendation: 50 },
            { item: 'Basmati Rice', currentStock: 8, predictedDepletion: '2025-07-11', reorderRecommendation: 25 },
            { item: 'Tomatoes', currentStock: 22, predictedDepletion: '2025-07-14', reorderRecommendation: 30 },
          ],
          staffing: [
            { date: '2025-07-11', shift: 'Lunch', recommendedStaff: 6, expectedOrders: 45 },
            { date: '2025-07-11', shift: 'Dinner', recommendedStaff: 8, expectedOrders: 62 },
            { date: '2025-07-12', shift: 'Lunch', recommendedStaff: 7, expectedOrders: 52 },
            { date: '2025-07-12', shift: 'Dinner', recommendedStaff: 9, expectedOrders: 71 },
          ],
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchForecastData()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!forecastData) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Predictive Analytics</span>
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={selectedView === 'revenue' ? 'primary' : 'secondary'}
            onClick={() => setSelectedView('revenue')}
          >
            Revenue
          </Button>
          <Button
            size="sm"
            variant={selectedView === 'inventory' ? 'primary' : 'secondary'}
            onClick={() => setSelectedView('inventory')}
          >
            Inventory
          </Button>
          <Button
            size="sm"
            variant={selectedView === 'staffing' ? 'primary' : 'secondary'}
            onClick={() => setSelectedView('staffing')}
          >
            Staffing
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedView === 'revenue' && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Revenue Forecast (Next 4 Days)</span>
            </h4>
            {forecastData.revenue.map((day, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                  <div className="text-sm text-gray-600">
                    Confidence: {Math.round(day.confidence * 100)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">£{day.predicted}</div>
                  <div className="text-xs text-gray-500">Predicted</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedView === 'inventory' && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Inventory Alerts</span>
            </h4>
            {forecastData.inventory.map((item, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{item.item}</div>
                    <div className="text-sm text-gray-600">
                      Current: {item.currentStock} units
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-red-600">
                      Depletes: {new Date(item.predictedDepletion).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Recommended reorder:</span>
                  <span className="font-medium">{item.reorderRecommendation} units</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedView === 'staffing' && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Staffing Recommendations</span>
            </h4>
            {forecastData.staffing.map((shift, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">
                    {new Date(shift.date).toLocaleDateString()} - {shift.shift}
                  </div>
                  <div className="text-sm text-gray-600">
                    Expected: {shift.expectedOrders} orders
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{shift.recommendedStaff}</div>
                  <div className="text-xs text-gray-500">Staff needed</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
