'use client'

import React from 'react'
import { Card, CardContent, Badge, Button } from '@tillu/ui'
import { AlertTriangle, X, Clock, Wifi, WifiOff } from 'lucide-react'

interface KitchenAlertsProps {
  isConnected: boolean
  alerts: any[]
  onClearAlert: (alertId: number) => void
  onClearAllAlerts: () => void
}

export function KitchenAlerts({ isConnected, alerts, onClearAlert, onClearAllAlerts }: KitchenAlertsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-white">Kitchen Alerts</h3>
          <Badge variant={isConnected ? "success" : "destructive"} className="flex items-center space-x-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </Badge>
        </div>
        {alerts.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAllAlerts} className="text-gray-400 hover:text-white">
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.length > 0 ? (
          alerts.slice(0, 10).map((alert) => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.severity === 'critical' ? 'bg-red-900/50 border-l-red-500' :
              alert.severity === 'warning' ? 'bg-yellow-900/50 border-l-yellow-500' :
              'bg-blue-900/50 border-l-blue-500'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                      alert.severity === 'critical' ? 'text-red-400' :
                      alert.severity === 'warning' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`} />
                    <div className="flex-1">
                      <h4 className={`font-medium text-sm ${
                        alert.severity === 'critical' ? 'text-red-200' :
                        alert.severity === 'warning' ? 'text-yellow-200' :
                        'text-blue-200'
                      }`}>{alert.title}</h4>
                      <p className={`text-xs ${
                        alert.severity === 'critical' ? 'text-red-300' :
                        alert.severity === 'warning' ? 'text-yellow-300' :
                        'text-blue-300'
                      }`}>{alert.message}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {new Intl.DateTimeFormat('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(alert.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onClearAlert(alert.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-gray-400">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active alerts</p>
                <p className="text-xs mt-1">Kitchen operations running smoothly</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
