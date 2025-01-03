export function hexToBase64(hexString: string): string {
  const res = hexString.replace("0x", "");
  const bytes = new Uint8Array(
    res.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
  );
  const base64 = btoa(
    Array.from(bytes)
      .map((byte) => String.fromCharCode(byte))
      .join(""),
  );
  return base64;
}
