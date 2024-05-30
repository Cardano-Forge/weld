export type UnsubscribeFunction = () => void;
export type HandlerFunction = () => void;

type EventTarget = "window" | "document";
type Event = { target: EventTarget; name: string; handler: HandlerFunction };

export class ListenerManager {
  private _intervals = new Set<NodeJS.Timeout>();
  private _timeouts = new Set<NodeJS.Timeout>();
  private _events = new Set<Event>();

  addInterval(handler: HandlerFunction, timeoutMs: number): UnsubscribeFunction {
    const interval = setInterval(handler, timeoutMs);
    this._intervals.add(interval);
    return () => {
      clearInterval(interval);
      this._intervals.delete(interval);
    };
  }

  addTimeout(handler: HandlerFunction, timeoutMs: number): UnsubscribeFunction {
    const timeout = setTimeout(handler, timeoutMs);
    this._timeouts.add(timeout);
    return () => {
      clearTimeout(timeout);
      this._timeouts.delete(timeout);
    };
  }

  addEvent(
    target: EventTarget,
    name: keyof WindowEventMap,
    handler: HandlerFunction,
  ): UnsubscribeFunction {
    const event: Event = { target, name, handler };
    globalThis[target].addEventListener(name, handler);
    this._events.add(event);
    return () => {
      this._removeEvent(event);
      this._events.delete(event);
    };
  }

  removeAll() {
    for (const interval of this._intervals) {
      clearInterval(interval);
      this._intervals.delete(interval);
    }

    for (const timeout of this._timeouts) {
      clearTimeout(timeout);
      this._timeouts.delete(timeout);
    }

    for (const event of this._events) {
      this._removeEvent(event);
      this._events.delete(event);
    }
  }

  private _removeEvent(event: Event) {
    globalThis[event.target].removeEventListener(event.name, event.handler);
  }
}
