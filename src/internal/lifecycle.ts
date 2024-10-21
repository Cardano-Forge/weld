export type UnsubscribeFct = () => void;

export class SubscriptionManager {
  constructor(private _subscriptions = new Set<UnsubscribeFct>()) {}

  add(unsubscribe: UnsubscribeFct) {
    this._subscriptions.add(unsubscribe);
    return () => {
      unsubscribe();
      this._subscriptions.delete(unsubscribe);
    };
  }

  clearAll() {
    for (const unsubscribe of this._subscriptions) {
      unsubscribe();
    }
    this._subscriptions.clear();
  }
}

export type InFlightSignal = {
  aborted: boolean;
};

export function newInFlightSignal({ aborted = false } = {}): InFlightSignal {
  return { aborted };
}

export class InFlightManager {
  constructor(private _inFlight = new Set<InFlightSignal>()) {}

  add(signal: InFlightSignal = newInFlightSignal()): InFlightSignal {
    this._inFlight.add(signal);
    return signal;
  }

  remove(signal: InFlightSignal) {
    this._inFlight.delete(signal);
  }

  abortAll() {
    for (const inFlight of this._inFlight) {
      inFlight.aborted = true;
    }
    this._inFlight.clear();
  }
}

export class LifeCycleManager {
  constructor(
    public subscriptions = new SubscriptionManager(),
    public inFlight = new InFlightManager(),
  ) {}

  cleanup() {
    this.subscriptions.clearAll();
    this.inFlight.abortAll();
  }
}
