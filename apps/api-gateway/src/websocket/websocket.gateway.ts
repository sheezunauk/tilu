import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WEBSOCKET_EVENTS } from '@tillu/shared';

interface ClientInfo {
  socket: Socket;
  branchId?: string;
  role?: string;
  userId?: string;
  lastActivity: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, ClientInfo>();
  private branchMetrics = new Map<string, { activeUsers: number; lastUpdate: Date }>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, { 
      socket: client, 
      lastActivity: new Date() 
    });
    
    client.emit('connection-established', { 
      clientId: client.id, 
      timestamp: new Date() 
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const clientInfo = this.connectedClients.get(client.id);
    
    if (clientInfo?.branchId) {
      this.updateBranchMetrics(clientInfo.branchId);
      this.broadcastToBranch(clientInfo.branchId, WEBSOCKET_EVENTS.USER_DISCONNECTED, {
        userId: clientInfo.userId,
        role: clientInfo.role,
        timestamp: new Date(),
      });
    }
    
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-branch')
  handleJoinBranch(@MessageBody() data: { branchId: string; role: string; userId?: string }, @ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.branchId = data.branchId;
      clientInfo.role = data.role;
      clientInfo.userId = data.userId;
      clientInfo.lastActivity = new Date();
      
      client.join(`branch-${data.branchId}`);
      client.join(`role-${data.role}`);
      
      this.updateBranchMetrics(data.branchId);
      
      this.broadcastToBranch(data.branchId, WEBSOCKET_EVENTS.USER_JOINED, {
        userId: data.userId,
        role: data.role,
        timestamp: new Date(),
      });
      
      client.emit('branch-joined', {
        branchId: data.branchId,
        role: data.role,
        activeUsers: this.getActiveBranchUsers(data.branchId),
      });
    }
  }

  @SubscribeMessage('leave-branch')
  handleLeaveBranch(@MessageBody() data: { branchId: string }, @ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    
    client.leave(`branch-${data.branchId}`);
    
    if (clientInfo?.role) {
      client.leave(`role-${clientInfo.role}`);
      
      this.broadcastToBranch(data.branchId, WEBSOCKET_EVENTS.USER_LEFT, {
        userId: clientInfo.userId,
        role: clientInfo.role,
        timestamp: new Date(),
      });
    }
    
    this.updateBranchMetrics(data.branchId);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
      client.emit('heartbeat-ack', { timestamp: new Date() });
    }
  }

  @SubscribeMessage('order-status-update')
  handleOrderStatusUpdate(@MessageBody() data: { orderId: string; status: string; branchId: string }, @ConnectedSocket() client: Socket) {
    this.broadcastToBranch(data.branchId, WEBSOCKET_EVENTS.ORDER_UPDATED, {
      orderId: data.orderId,
      status: data.status,
      timestamp: new Date(),
      updatedBy: this.connectedClients.get(client.id)?.userId,
    });
  }

  @SubscribeMessage('kitchen-queue-update')
  handleKitchenQueueUpdate(@MessageBody() data: { queueData: any; branchId: string }, @ConnectedSocket() client: Socket) {
    this.broadcastToBranch(data.branchId, WEBSOCKET_EVENTS.KITCHEN_UPDATE, {
      ...data.queueData,
      timestamp: new Date(),
      updatedBy: this.connectedClients.get(client.id)?.userId,
    });
  }

  @SubscribeMessage('inventory-alert')
  handleInventoryAlert(@MessageBody() data: { itemId: string; currentStock: number; minimumStock: number; branchId: string }) {
    this.broadcastToRole('manager', WEBSOCKET_EVENTS.INVENTORY_ALERT, {
      ...data,
      alertType: 'low_stock',
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('staff-message')
  handleStaffMessage(@MessageBody() data: { message: string; targetRole?: string; branchId: string }, @ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    const messageData = {
      message: data.message,
      from: clientInfo?.userId,
      fromRole: clientInfo?.role,
      timestamp: new Date(),
    };

    if (data.targetRole) {
      this.broadcastToRole(data.targetRole, WEBSOCKET_EVENTS.STAFF_MESSAGE, messageData);
    } else {
      this.broadcastToBranch(data.branchId, WEBSOCKET_EVENTS.STAFF_MESSAGE, messageData);
    }
  }

  broadcastToBranch(branchId: string, event: string, data: any) {
    this.server.to(`branch-${branchId}`).emit(event, data);
  }

  broadcastToRole(role: string, event: string, data: any) {
    this.server.to(`role-${role}`).emit(event, data);
  }

  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  broadcastOrderUpdate(order: any) {
    this.broadcastToBranch(order.branchId, WEBSOCKET_EVENTS.ORDER_UPDATED, {
      ...order,
      timestamp: new Date(),
    });
    
    if (order.status === 'ready') {
      this.broadcastToRole('delivery', WEBSOCKET_EVENTS.DELIVERY_READY, order);
    }
  }

  broadcastKitchenUpdate(kitchenData: any) {
    this.broadcastToBranch(kitchenData.branchId, WEBSOCKET_EVENTS.KITCHEN_UPDATE, {
      ...kitchenData,
      timestamp: new Date(),
    });
  }

  broadcastInventoryUpdate(inventoryData: any) {
    this.broadcastToBranch(inventoryData.branchId, WEBSOCKET_EVENTS.INVENTORY_UPDATE, {
      ...inventoryData,
      timestamp: new Date(),
    });
    
    if (inventoryData.currentStock <= inventoryData.minimumStock) {
      this.broadcastToRole('manager', WEBSOCKET_EVENTS.INVENTORY_ALERT, {
        ...inventoryData,
        alertType: 'low_stock',
        timestamp: new Date(),
      });
    }
  }

  sendStaffNotification(branchId: string, notification: any) {
    this.broadcastToBranch(branchId, WEBSOCKET_EVENTS.STAFF_NOTIFICATION, {
      ...notification,
      timestamp: new Date(),
    });
  }

  sendFlashOffer(branchId: string, offer: any) {
    this.broadcastToBranch(branchId, WEBSOCKET_EVENTS.FLASH_OFFER, {
      ...offer,
      timestamp: new Date(),
    });
  }

  sendSystemAlert(alertData: any) {
    this.broadcastToAll(WEBSOCKET_EVENTS.SYSTEM_ALERT, {
      ...alertData,
      timestamp: new Date(),
    });
  }

  private updateBranchMetrics(branchId: string) {
    const activeUsers = this.getActiveBranchUsers(branchId);
    this.branchMetrics.set(branchId, {
      activeUsers,
      lastUpdate: new Date(),
    });
    
    this.broadcastToBranch(branchId, WEBSOCKET_EVENTS.BRANCH_METRICS, {
      branchId,
      activeUsers,
      timestamp: new Date(),
    });
  }

  private getActiveBranchUsers(branchId: string): number {
    let count = 0;
    for (const [, clientInfo] of this.connectedClients) {
      if (clientInfo.branchId === branchId) {
        count++;
      }
    }
    return count;
  }

  getBranchMetrics(branchId: string) {
    return this.branchMetrics.get(branchId) || { activeUsers: 0, lastUpdate: new Date() };
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.values()).map(client => ({
      branchId: client.branchId,
      role: client.role,
      userId: client.userId,
      lastActivity: client.lastActivity,
    }));
  }

  @SubscribeMessage('join-customer')
  handleJoinCustomer(@MessageBody() data: { customerId: string; branchId: string }, @ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.branchId = data.branchId;
      clientInfo.userId = data.customerId;
      clientInfo.role = 'customer';
      
      client.join(`branch-${data.branchId}`);
      client.join('customers');
      
      client.emit('customer-joined', {
        customerId: data.customerId,
        branchId: data.branchId,
      });
    }
  }

  @SubscribeMessage('leave-customer')
  handleLeaveCustomer(@MessageBody() data: { customerId: string }, @ConnectedSocket() client: Socket) {
    client.leave('customers');
  }

  @SubscribeMessage('track-item-view')
  handleTrackItemView(@MessageBody() data: { customerId: string; itemId: string; timestamp: Date }) {
    console.log('Item view tracked:', data);
  }

  @SubscribeMessage('request-recommendations')
  handleRequestRecommendations(@MessageBody() data: { customerId: string; currentCart: any[]; branchId: string }, @ConnectedSocket() client: Socket) {
    client.emit('recommendations-ready', {
      customerId: data.customerId,
      recommendations: [], // Would be populated by AI service
    });
  }

  @SubscribeMessage('place-order')
  handlePlaceOrder(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.broadcastToBranch(data.branchId, WEBSOCKET_EVENTS.ORDER_UPDATED, {
      ...data,
      status: 'confirmed',
      timestamp: new Date(),
    });
  }

  handleInventoryUpdate(data: any) {
    this.broadcastInventoryUpdate(data);
  }

  handleSystemAlert(data: any) {
    this.sendSystemAlert(data);
  }

  handleFlashDeal(data: any) {
    this.broadcastToBranch(data.branchId, 'flash-deal', {
      ...data,
      timestamp: new Date(),
    });
  }
}
