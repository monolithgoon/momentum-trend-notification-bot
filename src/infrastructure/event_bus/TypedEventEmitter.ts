import { EventEmitter } from "events";
import { EventPayloadMap } from "./EventPayloadMap.interface";

/**
 * A strongly-typed wrapper around Node.js's EventEmitter, allowing for type-safe event emission and handling.
 * 
 * The `TypedEventEmitter` class enforces that only events and payloads defined in the `EventPayloadMap` type
 * can be emitted or listened to, providing compile-time safety for event-driven architectures.
 * 
 * @template EventPayloadMap - An interface mapping event names (as keys) to their corresponding payload types.
 * 
 * Example EventPayloadMap:
 * 
 * interface EventPayloadMap {
 *   USER_CREATED: { id: string, name: string };
 *   ORDER_PLACED: { orderId: string, total: number };
 * }
 *
 * Usage:
 * 
 * typedEventEmitter.emit("USER_CREATED", { id: "123", name: "Alice" });
 * typedEventEmitter.on("ORDER_PLACED", (data) => console.log(data.orderId));
 */

class TypedEventEmitter {
  private emitter = new EventEmitter();

  emit<K extends keyof EventPayloadMap>(event: K, payload: EventPayloadMap[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof EventPayloadMap>(event: K, listener: (payload: EventPayloadMap[K]) => void): void {
    this.emitter.on(event, listener);
  }

  once<K extends keyof EventPayloadMap>(event: K, listener: (payload: EventPayloadMap[K]) => void): void {
    this.emitter.once(event, listener);
  }

  off<K extends keyof EventPayloadMap>(event: K, listener: (payload: EventPayloadMap[K]) => void): void {
    this.emitter.off(event, listener);
  }
}

export const typedEventEmitter = new TypedEventEmitter();
