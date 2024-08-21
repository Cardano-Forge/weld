import { hexToString } from "./hex-to-string";

export function viewToString(view: Uint8Array, outputType: "string" | "hex" = "string") {
  let result = "";
  let value: string;

  for (let i = 0; i < view.length; i++) {
    value = view[i].toString(16);
    result += value.length === 1 ? `0${value}` : value;
  }

  if (result.startsWith("000de140")) {
    result = result.replace("000de140", "");
  }

  return outputType === "hex" ? result : hexToString(result);
}
