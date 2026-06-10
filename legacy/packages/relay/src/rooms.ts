/**
 * Room Manager
 *
 * Manages rooms (active CLI sessions) with in-memory event buffers.
 * Each room holds up to BUFFER_SIZE events in a circular buffer.
 */

import type { RelayEvent, Room } from './types';

const BUFFER_SIZE = 200;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Check every minute
const MAX_ROOM_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Circular buffer for events */
class EventBuffer {
  private buffer: RelayEvent[] = [];
  private maxSize: number;

  constructor(maxSize = BUFFER_SIZE) {
    this.maxSize = maxSize;
  }

  push(event: RelayEvent): void {
    this.buffer.push(event);
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }
  }

  pushMany(events: RelayEvent[]): void {
    for (const event of events) {
      this.push(event);
    }
  }

  getAll(): RelayEvent[] {
    return [...this.buffer];
  }

  get size(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}

/** Room state (in-memory) */
interface RoomState {
  room: Room;
  buffer: EventBuffer;
}

/** Room Manager — in-memory, single-process */
class RoomManager {
  private rooms = new Map<string, RoomState>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    // Periodic cleanup of stale rooms
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  /** Create or reactivate a room */
  createRoom(roomId: string, userId: string, projectName: string, projectPath?: string): Room {
    const existing = this.rooms.get(roomId);
    if (existing) {
      existing.room.status = 'active';
      existing.room.lastActivity = Date.now();
      existing.room.cliConnected = true;
      return existing.room;
    }

    const room: Room = {
      id: roomId,
      userId,
      projectName,
      projectPath,
      status: 'active',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      cliConnected: false,
      dashboardClients: 0,
    };

    this.rooms.set(roomId, { room, buffer: new EventBuffer() });
    return room;
  }

  /** Get a room by ID */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)?.room;
  }

  /** Get all rooms for a user */
  getUserRooms(userId: string): Room[] {
    const rooms: Room[] = [];
    for (const state of this.rooms.values()) {
      if (state.room.userId === userId) {
        rooms.push(state.room);
      }
    }
    return rooms.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /** Add event to room buffer */
  addEvent(roomId: string, event: RelayEvent): boolean {
    const state = this.rooms.get(roomId);
    if (!state) return false;
    state.buffer.push(event);
    state.room.lastActivity = Date.now();
    state.room.status = 'active';
    return true;
  }

  /** Add multiple events (backfill after reconnect) */
  addBulkEvents(roomId: string, events: RelayEvent[]): boolean {
    const state = this.rooms.get(roomId);
    if (!state) return false;
    state.buffer.pushMany(events);
    state.room.lastActivity = Date.now();
    return true;
  }

  /** Get buffered events for a room */
  getEvents(roomId: string): RelayEvent[] {
    return this.rooms.get(roomId)?.buffer.getAll() ?? [];
  }

  /** Mark CLI as connected/disconnected */
  setCliConnected(roomId: string, connected: boolean): void {
    const state = this.rooms.get(roomId);
    if (!state) return;
    state.room.cliConnected = connected;
    state.room.lastActivity = Date.now();
    if (!connected) {
      state.room.status = 'idle';
    }
  }

  /** Track dashboard client count */
  addDashboardClient(roomId: string): void {
    const state = this.rooms.get(roomId);
    if (state) state.room.dashboardClients++;
  }

  removeDashboardClient(roomId: string): void {
    const state = this.rooms.get(roomId);
    if (state && state.room.dashboardClients > 0) {
      state.room.dashboardClients--;
    }
  }

  /** Delete a room */
  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /** Get room stats */
  getStats(roomId: string): { eventCount: number; bufferSize: number } | undefined {
    const state = this.rooms.get(roomId);
    if (!state) return undefined;
    return {
      eventCount: state.buffer.size,
      bufferSize: BUFFER_SIZE,
    };
  }

  /** Cleanup stale rooms */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, state] of this.rooms) {
      const age = now - state.room.createdAt;
      const idle = now - state.room.lastActivity;

      // Remove rooms older than 24h
      if (age > MAX_ROOM_AGE_MS) {
        this.rooms.delete(id);
        console.log(`[Rooms] Cleaned up expired room: ${id}`);
        continue;
      }

      // Mark idle rooms (no activity for 5min and no CLI)
      if (idle > IDLE_TIMEOUT_MS && !state.room.cliConnected) {
        if (state.room.status === 'active') {
          state.room.status = 'idle';
        }
        // Close rooms idle for 1h with no clients
        if (idle > 60 * 60 * 1000 && state.room.dashboardClients === 0) {
          state.room.status = 'closed';
          this.rooms.delete(id);
          console.log(`[Rooms] Cleaned up idle room: ${id}`);
        }
      }
    }
  }

  /** Total active rooms */
  get totalRooms(): number {
    return this.rooms.size;
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}

export const roomManager = new RoomManager();
