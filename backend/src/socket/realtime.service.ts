import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { waitUntil } from '@vercel/functions';
import { RealtimeGateway } from './realtime.gateway';
import { rooms } from './rooms';

// Single entry point for real-time fan-out. With SUPABASE_URL + SUPABASE_SECRET_KEY
// set, events go to Supabase Realtime private channels (needed on Vercel, where no
// process holds sockets open); otherwise they go through the Socket.IO gateway.
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly supabaseUrl?: string;
  private readonly secretKey?: string;

  constructor(
    private readonly gateway: RealtimeGateway,
    config: ConfigService,
  ) {
    this.supabaseUrl = config.get<string>('SUPABASE_URL')?.replace(/\/+$/, '');
    this.secretKey = config.get<string>('SUPABASE_SECRET_KEY');
  }

  get usesSupabase(): boolean {
    return Boolean(this.supabaseUrl && this.secretKey);
  }

  toRestaurant(restaurantId: string, event: string, payload: unknown): void {
    this.publish(rooms.restaurant(restaurantId), event, payload);
  }

  toKitchen(restaurantId: string, event: string, payload: unknown): void {
    this.publish(rooms.kitchen(restaurantId), event, payload);
  }

  toAdminDashboard(restaurantId: string, event: string, payload: unknown): void {
    this.publish(rooms.adminDashboard(restaurantId), event, payload);
  }

  toTable(restaurantId: string, tableId: string, event: string, payload: unknown): void {
    this.publish(rooms.table(restaurantId, tableId), event, payload);
  }

  private publish(topic: string, event: string, payload: unknown): void {
    if (!this.usesSupabase) {
      this.gateway.emit(topic, event, payload);
      return;
    }
    // waitUntil keeps a Vercel function alive until the broadcast lands after the
    // response is sent. Outside Vercel it is a no-op and the promise runs normally.
    waitUntil(this.broadcast(topic, event, payload));
  }

  private async broadcast(topic: string, event: string, payload: unknown): Promise<void> {
    const url =
      `${this.supabaseUrl}/realtime/v1/api/broadcast/` +
      `${encodeURIComponent(topic)}/events/${encodeURIComponent(event)}?private=true`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        // New sb_secret_ keys are not JWTs, so they go in apikey only.
        headers: { apikey: this.secretKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      if (!res.ok) {
        this.logger.warn(`Broadcast ${event} -> ${topic} failed: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      this.logger.warn(`Broadcast ${event} -> ${topic} failed: ${(err as Error).message}`);
    }
  }
}
