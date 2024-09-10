// @ts-nocheck
//
// Call this function when your page is ready to handle wallet connections.
// A wallet that loaded your page into an iframe will first send a connect/handshake to establish the dapp-connector bridge.
// You can be sure that this will be the only wallet that connects at this time, and call enable() right away
// to save a user from clicking your connect button.

import { DefaultWalletApi } from "@/lib/main";

function hasOwnProperty(obj: any, prop: any) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

declare type OnBridgeCreated = (walletApi: DefaultWalletApi) => void;

// Callback onBridgeCreated: async (walletApi) => {}
export function initializeDAppConnectorBridge(onBridgeCreated: OnBridgeCreated) {
  const _debug = false; // set to true for debug logs.
  const _label = "DAppConnectorBridge: "; // set to true for debug logs.

  let _walletNamespace: string | null = null; // eg. eternl
  let _initialApiObject: any = null; // CIP0030 initial api object
  let _fullApiObject = null; // CIP0030 full api object

  const _bridge = { type: "cardano-dapp-connector-bridge", source: null, origin: null };
  const _requestMap = {};
  const _methodMap = {
    // Initial 3 methods to establish connection. More endpoints will be added by the wallet.

    connect: "connect",
    handshake: "handshake",
    enable: "enable",
    isEnabled: "isEnabled",
  };

  function generateUID() {
    return (
      ("000" + ((Math.random() * 46656) | 0).toString(36)).slice(-3) +
      ("000" + ((Math.random() * 46656) | 0).toString(36)).slice(-3)
    );
  }

  function createRequest(method: any) {
    const args = [...arguments];

    if (args.length > 0) args.shift();

    return new Promise((resolve, reject) => {
      const request = {
        payload: {
          type: _bridge.type,
          to: _walletNamespace,
          uid: generateUID(),

          method: method,
          args: args,
        },

        resolve: resolve,
        reject: reject,
      };

      _requestMap[request.payload.uid] = request;

      if (_debug) {
        console.log(_label + "_requestMap:", _requestMap);
      }

      _bridge.source?.postMessage(request.payload, _bridge.origin);
    });
  }

  function generateApiFunction(method) {
    return function () {
      return createRequest(method, ...arguments);
    };
  }

  function generateApiObject(obj) {
    const apiObj = {};

    for (const key in obj) {
      const value = obj[key];

      if (_debug) {
        console.log(_label + "init: key/value:", key, value);
      }

      if (typeof value === "string") {
        if (key === "feeAddress") {
          apiObj[key] = value;
        } else {
          apiObj[key] = generateApiFunction(value);
          _methodMap[value] = value;
        }
      } else if (typeof value === "object") {
        apiObj[key] = generateApiObject(value);
      } else {
        apiObj[key] = value;
      }
    }

    return apiObj;
  }

  function initBridge(source, origin, walletNamespace, initialApi) {
    if (!hasOwnProperty(window, "cardano")) {
      window.cardano = {};
    }

    if (hasOwnProperty(window.cardano, walletNamespace)) {
      console.warn(
        "Warn: " +
        _label +
        "window.cardano." +
        walletNamespace +
        " already present, skipping initialApi creation.",
      );

      return null;
    }

    _bridge.source = source;
    _bridge.origin = origin;

    _walletNamespace = walletNamespace;

    const initialApiObj = {
      isBridge: true,

      // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0030
      isEnabled: function () {
        return createRequest("isEnabled");
      },
      enable: function () {
        return createRequest("enable");
      },

      apiVersion: initialApi.apiVersion,
      name: initialApi.name,
      icon: initialApi.icon ? initialApi.icon : null,

      // extension: https://github.com/cardano-foundation/CIPs/pull/183
      experimental: {},
    };

    window.cardano[walletNamespace] = initialApiObj;

    if (initialApi.experimental) {
      initialApiObj.experimental = {
        ...generateApiObject(initialApi.experimental),
      };
    }

    return window.cardano[walletNamespace];
  }

  function isValidBridge(payload) {
    if (!_initialApiObject) {
      if (payload.data.method !== _methodMap.connect) {
        console.error("Error: " + _label + "send 'connect' first.");

        return false;
      }

      const initialApi = payload.data.initialApi;

      if (!initialApi || !initialApi.isBridge || !initialApi.apiVersion || !initialApi.name) {
        console.error("Error: " + _label + "'connect' is missing correct initialApi.", initialApi);

        return false;
      }

      if (!payload.data.walletNamespace) {
        console.error(
          "Error: " + _label + "'connect' is missing walletNamespace.",
          payload.data.walletNamespace,
        );

        return false;
      }

      _initialApiObject = initBridge(
        payload.source,
        payload.origin,
        payload.data.walletNamespace,
        initialApi,
      );
    }

    if (
      !(
        _initialApiObject &&
        hasOwnProperty(window, "cardano") &&
        window.cardano[payload.data.walletNamespace] === _initialApiObject
      )
    ) {
      console.warn(
        "Warn: " + _label + "bridge not set up correctly:",
        _bridge,
        _initialApiObject,
        _walletNamespace,
      );

      return false;
    }

    return true;
  }

  function isValidMessage(payload) {
    if (!payload.data || !payload.origin || !payload.source) return false;
    if (payload.data.type !== _bridge.type) return false;
    if (!hasOwnProperty(_methodMap, payload.data.method)) return false;
    if (_walletNamespace && payload.data.walletNamespace !== _walletNamespace) return false;

    return true;
  }

  async function onMessage(payload) {
    if (!isValidMessage(payload) || !isValidBridge(payload)) return;

    if (_debug) {
      console.log("########################");
      console.log(_label + "onMessage: got message");
      console.log(_label + "onMessage: origin:", payload.origin);
      // console.log(_label+'onMessage: source:', payload.source) // Don't log source, might break browser security rules
      console.log(_label + "onMessage: data: ", payload.data);
      console.log("########################");
    }

    if (payload.data.method === _methodMap.connect) {
      const success = await createRequest("handshake");

      if (success && _initialApiObject) {
        if (onBridgeCreated) onBridgeCreated(_initialApiObject);
      }

      return;
    }

    if (!payload.data.uid) return;

    const request = _requestMap[payload.data.uid];

    if (!request) return;

    let response = payload.data.response;
    const error = payload.data.error;

    if (error) {
      request.reject(error);

      delete _requestMap[payload.data.uid];

      return;
    }

    // Bridge is set up correctly, message is valid, method is known.

    if (payload.data.method === _methodMap.enable) {
      _fullApiObject = null;

      if (typeof response === "object") {
        _fullApiObject = {
          ...generateApiObject(response),
        };

        response = _fullApiObject;

        if (_debug) {
          console.log(_label + "onMessage: fullApiObject:", _fullApiObject);
        }
      }
    }

    request.resolve(response);

    delete _requestMap[payload.data.uid];
  }

  window.addEventListener("message", onMessage, false);
}
