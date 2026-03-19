import { describe, expect, it } from "vitest";
import { LifeCycleManager } from "./lifecycle";
import { UtxosUpdateManager } from "./utxos-update";

describe("UtxosUpdateManager", () => {
	it("should resolve when there is no race condition", async () => {
		const lifecycle = new LifeCycleManager();
		const m = new UtxosUpdateManager();
		const r = m.start({ lifecycle });

		const utxos = ["utxo1", "utxo2"];

		r.resolve(utxos);

		await expect(r.update.promise).resolves.toBe(utxos);
		expect(m.runningUpdate).toBeUndefined();
	});

	it("should always resolve with the last started update", async () => {
		const lifecycle = new LifeCycleManager();
		const m = new UtxosUpdateManager();

		const utxos1 = ["utxo1"];
		const utxos2 = ["utxo1", "utxo2"];
		const utxos3 = ["utxo1", "utxo2", "utxo3"];

		const r1 = m.start({ lifecycle });
		const r2 = m.start({ lifecycle });
		const r3 = m.start({ lifecycle });

		const p1 = r1.update.promise;
		const p2 = r2.update.promise;
		const p3 = r3.update.promise;

		r1.resolve(utxos1);
		r2.resolve(utxos2);
		r3.resolve(utxos3);

		await expect(p1).resolves.toBe(utxos3);
		await expect(p2).resolves.toBe(utxos3);
		await expect(p3).resolves.toBe(utxos3);

		expect(m.runningUpdate).toBeUndefined();
	});

	it("should be reusable", async () => {
		const lifecycle = new LifeCycleManager();
		const m = new UtxosUpdateManager();

		const utxos1 = ["utxo1"];
		const utxos2 = ["utxo1", "utxo2"];

		const r1 = m.start({ lifecycle });
		expect(m.runningUpdate).toBe(r1.update);
		r1.resolve(utxos1);
		await expect(r1.update.promise).resolves.toBe(utxos1);
		expect(m.runningUpdate).toBeUndefined();

		const r2 = m.start({ lifecycle });
		expect(m.runningUpdate).toBe(r2.update);
		r2.resolve(utxos2);
		await expect(r2.update.promise).resolves.toBe(utxos2);
		expect(m.runningUpdate).toBeUndefined();
	});
});
