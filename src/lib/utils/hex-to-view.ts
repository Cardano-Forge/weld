export function hexToView(input: string) {
  if (typeof input !== "string") {
    throw new TypeError("Expected input to be a string");
  }

  if (input.length % 2 !== 0) {
    throw new RangeError("Expected string to be an even number of characters");
  }

  const view = new Uint8Array(input.length / 2);

  for (let i = 0; i < input.length; i += 2) {
    view[i / 2] = Number.parseInt(input.substring(i, i + 2), 16);
  }

  return view;
}
