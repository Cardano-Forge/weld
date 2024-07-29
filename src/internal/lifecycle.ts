export type UnsubscribeFct = () => void;

class SubscriptionManager {
  private _subscriptions = new Set<UnsubscribeFct>();

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

class InFlightManager {
  private _inFlight = new Set<InFlightSignal>();

  add() {
    const signal: InFlightSignal = { aborted: false };
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
  subscriptions = new SubscriptionManager();
  inFlight = new InFlightManager();

  cleanup() {
    this.subscriptions.clearAll();
    this.inFlight.abortAll();
  }
}
