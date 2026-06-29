import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

interface SocketData {
  userId?: string;
  restaurantId?: string;
}

// Room name helpers keep all event targeting consistent.
const rooms = {
  restaurant: (id: string) => `restaurant:${id}`,
  kitchen: (id: string) => `kitchen:${id}`,
  adminDashboard: (id: string) => `admin-dashboard:${id}`,
  table: (id: string) => `table:${id}`,
};

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Authenticate on connection; auto-join the restaurant room.
  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; restaurantId: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      const data = client.data as SocketData;
      data.userId = payload.sub;
      data.restaurantId = payload.restaurantId;
      void client.join(rooms.restaurant(payload.restaurantId));
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join.kitchen')
  joinKitchen(@ConnectedSocket() client: Socket): void {
    const { restaurantId } = client.data as SocketData;
    if (restaurantId) void client.join(rooms.kitchen(restaurantId));
  }

  @SubscribeMessage('join.admin-dashboard')
  joinAdminDashboard(@ConnectedSocket() client: Socket): void {
    const { restaurantId } = client.data as SocketData;
    if (restaurantId) void client.join(rooms.adminDashboard(restaurantId));
  }

  @SubscribeMessage('join.table')
  joinTable(@ConnectedSocket() client: Socket, @MessageBody() body: { tableId: string }): void {
    if (body?.tableId) void client.join(rooms.table(body.tableId));
  }

  // ---- Emit helpers (used by services) ----

  toRestaurant(restaurantId: string, event: string, payload: unknown): void {
    this.server.to(rooms.restaurant(restaurantId)).emit(event, payload);
  }

  toKitchen(restaurantId: string, event: string, payload: unknown): void {
    this.server.to(rooms.kitchen(restaurantId)).emit(event, payload);
  }

  toAdminDashboard(restaurantId: string, event: string, payload: unknown): void {
    this.server.to(rooms.adminDashboard(restaurantId)).emit(event, payload);
  }

  toTable(tableId: string, event: string, payload: unknown): void {
    this.server.to(rooms.table(tableId)).emit(event, payload);
  }
}
