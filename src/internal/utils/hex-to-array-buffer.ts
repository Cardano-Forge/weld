/**
 * @param input - specified as a string of hexadecimal characters
 * @returns a new ArrayBuffer with the binary content from `input`
 *
 * @link [Source](https://github.com/LinusU/hex-to-array-buffer/blob/master/index.js)
 */
export function hexToArrayBuffer(input: string): ArrayBuffer {
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

  return view.buffer;
}
