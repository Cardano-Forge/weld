import type { InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { deferredPromise } from "@/internal/utils/deferred-promise";
import { Debuggable } from "./utils/debuggable";

export type RunningUtxosUpdate = {
  id: number;
  signal: InFlightSignal;
  promise: Promise<string[]>;
  resolve: (utxos: string[]) => void;
};

export class UtxosUpdateManager extends Debuggable {
  private _runningUpdate: RunningUtxosUpdate | undefined = undefined;

  start({ lifecycle }: { lifecycle: LifeCycleManager }) {
    const id = this._nextId();
    const { promise, resolve } = deferredPromise<string[]>();
    const signal = lifecycle.inFlight.add();
    this._log("starting", id);
    if (this._runningUpdate) {
      this._log("cancelling", this._runningUpdate.id);
      this._runningUpdate.signal.aborted = true;
    }
    const update: RunningUtxosUpdate = { id, promise, signal, resolve };
    this._runningUpdate = update;
    return {
      update,
      resolve: (utxos: string[]) => {
        this._log("resolving", id);
        if (this._runningUpdate && this._runningUpdate !== update) {
          this._log(id, "will resolve with", this.runningUpdate?.id);
          this._runningUpdate.promise.then(update.resolve);
        } else {
          this._log("resolving", id, "as is");
          update.resolve(utxos);
        }
        if (this._runningUpdate === update) {
          this._log("cleaning up on", id);
          this._runningUpdate = undefined;
        }
      },
    };
  }

  get runningUpdate() {
    return this._runningUpdate;
  }

  private _lastId = 0;
  private _nextId() {
    return ++this._lastId;
  }
}
