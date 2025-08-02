// src/infrastructure/eventBus/typedEventEmitter.ts

import { EventEmitter } from "events";
import { EventPayloadMap } from "./EventPayloadMap.interface";

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
