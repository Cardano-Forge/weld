import type { EventByUnsupportedWallet, WeldEvent } from "@/internal/events";

declare global {
  interface Document {
    addEventListener<TEvent extends keyof WeldEvent>(
      type: TEvent,
      listener: (this: Document, event: CustomEvent<WeldEvent[TEvent]>) => void,
    ): void;
    removeEventListener<TEvent extends keyof WeldEvent>(
      type: TEvent,
      listener: (this: Document, event: CustomEvent<WeldEvent[TEvent]>) => void,
    ): void;
  }
}

type Subscription = { unsubscribe(): void };

export function subscribe<TEvent extends keyof WeldEvent>(
  event: TEvent,
  listener: (data: WeldEvent[TEvent]) => void | Promise<void>,
): Subscription;
export function subscribe<TEvent extends keyof EventByUnsupportedWallet>(
  event: TEvent,
  listener: (data: EventByUnsupportedWallet[TEvent]) => void | Promise<void>,
): Subscription;
export function subscribe<TEvent extends keyof WeldEvent>(
  event: TEvent,
  listener: (data: WeldEvent[TEvent]) => void | Promise<void>,
): Subscription {
  function handler(event: CustomEvent<WeldEvent[TEvent]>) {
    listener(event.detail);
  }
  document.addEventListener(event, handler);
  return {
    unsubscribe() {
      document.removeEventListener(event, handler);
    },
  };
}
