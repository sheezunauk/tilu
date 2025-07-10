'use client'

import React from 'react'
import { Card, CardContent, Badge, Button } from '@tillu/ui'
import { Zap, Clock, Percent, Gift } from 'lucide-react'

interface PersonalizedOffersProps {
  offers: any[]
  onApplyOffer: (offerId: string) => void
}

export function PersonalizedOffers({ offers, onApplyOffer }: PersonalizedOffersProps) {
  if (offers.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Gift className="h-5 w-5 mr-2 text-purple-600" />
        Special Offers for You
      </h3>
      
      <div className="space-y-3">
        {offers.slice(0, 3).map((offer) => (
          <Card key={offer.id} className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {offer.type === 'flash_deal' && (
                      <Badge variant="destructive" className="animate-pulse">
                        <Zap className="h-3 w-3 mr-1" />
                        Flash Deal
                      </Badge>
                    )}
                    {offer.type === 'loyalty_reward' && (
                      <Badge variant="success">
                        <Gift className="h-3 w-3 mr-1" />
                        Loyalty Reward
                      </Badge>
                    )}
                    {offer.type === 'personalized' && (
                      <Badge variant="default">
                        <Percent className="h-3 w-3 mr-1" />
                        Just for You
                      </Badge>
                    )}
                  </div>
                  
                  <h4 className="font-semibold text-gray-900">{offer.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{offer.description}</p>
                  
                  {offer.validUntil && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      Valid until {new Date(offer.validUntil).toLocaleTimeString()}
                    </div>
                  )}
                </div>
                
                <div className="ml-4">
                  <Button
                    size="sm"
                    onClick={() => onApplyOffer(offer.id)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
