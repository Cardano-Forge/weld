import type { InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import { deferredPromise } from "@/internal/utils/deferred-promise";

export type RunningUtxosUpdate = {
  signal: InFlightSignal;
  promise: Promise<string[]>;
  resolve: (utxos: string[]) => void;
};

export class UtxosUpdateManager {
  private _runningUpdate: RunningUtxosUpdate | undefined = undefined;

  start({ lifecycle }: { lifecycle: LifeCycleManager }) {
    const { promise, resolve } = deferredPromise<string[]>();
    const signal = lifecycle.inFlight.add();
    if (this._runningUpdate) {
      this._runningUpdate.signal.aborted = true;
    }
    const update: RunningUtxosUpdate = { promise, signal, resolve };
    this._runningUpdate = update;
    return {
      update,
      success: (utxos: string[]) => {
        if (this._runningUpdate && this._runningUpdate !== update) {
          this._runningUpdate.promise.then(update.resolve);
        }
        update.resolve(utxos);
      },
      error: () => {
        if (this._runningUpdate && this._runningUpdate !== update) {
          update.promise.then(update.resolve);
        }
        resolve([]);
      },
      cleanup: () => {
        if (this._runningUpdate === update) {
          this._runningUpdate = undefined;
        }
      },
    };
  }

  async resolve(runningUpdate: RunningUtxosUpdate, utxos: string[]) {
    if (this._runningUpdate && this._runningUpdate !== runningUpdate) {
      return this._runningUpdate.promise.then((utxos) => {
        return runningUpdate.resolve(utxos);
      });
    }
    return runningUpdate.resolve(utxos);
  }

  get runningUpdate() {
    return this._runningUpdate;
  }
}
