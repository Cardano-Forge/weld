import { describe, expect, it } from "vitest";
import { LifeCycleManager } from "./lifecycle";
import { UtxosUpdateManager } from "./utxos-update";

describe("UtxosUpdateManager", () => {
  it("should resolve when there is no race condition", () => {
    const lifecycle = new LifeCycleManager();
    const m = new UtxosUpdateManager();
    const r = m.start({ lifecycle });

    const utxos = ["utxo1", "utxo2"];

    r.resolve(utxos);

    expect(r.update.promise).resolves.toBe(utxos);
    expect(m.runningUpdate).toBeUndefined();
  });

  it("should always resolve with the last started update", () => {
    const lifecycle = new LifeCycleManager();
    const m = new UtxosUpdateManager();

    const utxos1 = ["utxo1"];
    const utxos2 = ["utxo1", "utxo2"];
    const utxos3 = ["utxo1", "utxo2", "utxo3"];

    const r1 = m.start({ lifecycle });
    expect(m.runningUpdate).toBe(r1.update);

    const r2 = m.start({ lifecycle });
    expect(m.runningUpdate).toBe(r2.update);

    const r3 = m.start({ lifecycle });
    expect(m.runningUpdate).toBe(r3.update);

    r1.resolve(utxos1);
    expect(r1.update.promise).resolves.toBe(utxos3);
    expect(m.runningUpdate).toBe(r3.update);

    r2.resolve(utxos2);
    expect(r2.update.promise).resolves.toBe(utxos3);
    expect(m.runningUpdate).toBe(r3.update);

    r3.resolve(utxos3);
    expect(r3.update.promise).resolves.toBe(utxos3);

    expect(m.runningUpdate).toBeUndefined();
  });

  it("should be reusable", () => {
    const lifecycle = new LifeCycleManager();
    const m = new UtxosUpdateManager();

    const utxos1 = ["utxo1"];
    const utxos2 = ["utxo1", "utxo2"];

    const r1 = m.start({ lifecycle });
    expect(m.runningUpdate).toBe(r1.update);
    r1.resolve(utxos1);
    expect(r1.update.promise).resolves.toBe(utxos1);
    expect(m.runningUpdate).toBeUndefined();

    const r2 = m.start({ lifecycle });
    expect(m.runningUpdate).toBe(r2.update);
    r2.resolve(utxos2);
    expect(r2.update.promise).resolves.toBe(utxos2);
    expect(m.runningUpdate).toBeUndefined();
  });
});
