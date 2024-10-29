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
  id: string;
  aborted: boolean;
};

export function newInFlightSignal({
  id = crypto.randomUUID(),
  aborted = false,
} = {}): InFlightSignal {
  return { id, aborted };
}

export class InFlightManager {
  constructor(public signals = new Set<InFlightSignal>()) {}

  add(signal: InFlightSignal = newInFlightSignal()): InFlightSignal {
    this.signals.add(signal);
    return signal;
  }

  remove(signal: InFlightSignal) {
    this.signals.delete(signal);
  }

  abortAll() {
    for (const inFlight of this.signals) {
      inFlight.aborted = true;
    }
    this.signals.clear();
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
