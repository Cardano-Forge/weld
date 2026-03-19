import { setupAutoUpdate } from "@/internal/auto-update";
import { type InFlightSignal, LifeCycleManager } from "@/internal/lifecycle";
import {
	createStoreFactory,
	type Store,
	type StoreSetupFunctions,
} from "@/internal/store";
import {
	getInstalledExtensions as defaultGetInstalledExtensions,
	type ExtensionCache,
	type InstalledExtensions,
	newExtensionCache,
	newInstalledExtensions,
} from "@/lib/main/extensions";
import { SUPPORTED_WALLETS, type WalletInfo } from "@/lib/main/utils/wallets";
import { weld } from "..";
import type { ConfigStore } from "./config";

export type ExtensionsProps = InstalledExtensions & {
	isLoading: boolean;
	isFetching: boolean;
	registeredArr: WalletInfo[];
	registeredMap: Map<string, WalletInfo>;
};

export type ExtensionsApi = {
	update(): Promise<void>;
	registerWallets(wallets: WalletInfo[]): void;
};

export type ExtensionsStoreState = ExtensionsProps & ExtensionsApi;

export type ExtensionsStore = Store<ExtensionsStoreState> &
	ExtensionsStoreState;

type ExtendedExtensionsStoreState = ExtensionsStoreState & StoreSetupFunctions;

export const createExtensionsStore = createStoreFactory<
	ExtensionsStoreState,
	undefined,
	| []
	| [
			{
				config?: ConfigStore;
				lifecycle?: LifeCycleManager;
				cache?: ExtensionCache;
				getInstalledExtensions?: typeof defaultGetInstalledExtensions;
			},
	  ]
>(
	(
		setState,
		getState,
		{
			config = weld.config,
			lifecycle = new LifeCycleManager(),
			cache = newExtensionCache(),
			getInstalledExtensions = defaultGetInstalledExtensions,
		} = {},
	) => {
		const handleUpdateError = (error: unknown) => {
			config.onUpdateError?.("extensions", error);
			config.extensions.onUpdateError?.(error);
		};

		const registerWallets: ExtensionsApi["registerWallets"] = (wallets) => {
			const registeredArr = [...getState().registeredArr];
			const registeredMap = new Map(getState().registeredMap);
			let shouldSetState = false;
			for (const wallet of wallets) {
				if (!registeredMap.has(wallet.key)) {
					shouldSetState = true;
					registeredMap.set(wallet.key, wallet);
					registeredArr.push(wallet);
				}
			}
			if (shouldSetState) {
				setState({ registeredMap, registeredArr });
			}
		};

		const update = (async (signal?: InFlightSignal, stop?: () => void) => {
			if (config.debug) {
				console.log("[WELD] Extensions state update");
			}
			try {
				if (signal?.aborted) {
					stop?.();
					return;
				}
				setState({ isFetching: true });
				const res = await getInstalledExtensions({
					cache,
					registeredWallets: getState().registeredMap,
				});
				if (signal?.aborted) {
					stop?.();
					return;
				}
				setState({
					...res,
					isLoading: false,
					isFetching: false,
				});
			} catch (error) {
				handleUpdateError(error);
				setState({
					isLoading: false,
					isFetching: false,
				});
			}
		}) satisfies ExtensionsApi["update"];

		const __init = async () => {
			if (typeof window === "undefined") {
				return;
			}
			lifecycle.subscriptions.clearAll();
			const signal = lifecycle.inFlight.add();
			try {
				await update(signal);
				if (signal.aborted) {
					return;
				}
				setupAutoUpdate(
					(stop) => update(signal, stop),
					lifecycle,
					config,
					"extensions",
				);
			} finally {
				lifecycle.inFlight.remove(signal);
			}
		};

		const __cleanup = () => {
			lifecycle.cleanup();
		};

		const initialState: ExtendedExtensionsStoreState = {
			...newInstalledExtensions(),
			isLoading: true,
			isFetching: false,
			registeredArr: [...SUPPORTED_WALLETS],
			registeredMap: new Map(
				SUPPORTED_WALLETS.map((wallet) => [wallet.key, wallet]),
			),
			update,
			registerWallets,
			__init,
			__cleanup,
		};

		return initialState as ExtensionsStoreState;
	},
);
