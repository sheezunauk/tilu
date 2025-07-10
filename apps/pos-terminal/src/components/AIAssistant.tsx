'use client'

import React, { useState } from 'react'
import { Button, Card, CardContent, Input } from '@tillu/ui'
import { MessageCircle, Send, X } from 'lucide-react'

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
  branchId?: string
}

export function AIAssistant({ isOpen, onClose, branchId = 'branch-1' }: AIAssistantProps) {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const askAssistant = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:8000/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, context: branchId }),
      })

      const data = await res.json()
      setResponse(data.response)
      setQuery('')
    } catch (error) {
      setResponse('Sorry, I encountered an error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96 max-h-[500px] m-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <span>AI Assistant</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {response && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <div className="whitespace-pre-wrap">{response}</div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex space-x-2">
              <Input
                placeholder="Ask about sales, inventory, customers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && askAssistant()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={askAssistant} 
                disabled={isLoading || !query.trim()}
                className="px-3"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="text-gray-600 font-medium">Quick suggestions:</div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="text-xs h-8 justify-start"
                  onClick={() => setQuery("What are today's sales?")}
                >
                  Today's sales
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="text-xs h-8 justify-start"
                  onClick={() => setQuery("Check stock levels")}
                >
                  Stock levels
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="text-xs h-8 justify-start"
                  onClick={() => setQuery("Popular items")}
                >
                  Popular items
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="text-xs h-8 justify-start"
                  onClick={() => setQuery("Kitchen status")}
                >
                  Kitchen status
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
