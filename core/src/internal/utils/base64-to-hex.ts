export function base64ToHex(base64String: string): string {
  const binaryString = atob(base64String);
  const hex = Array.from(binaryString)
    .map((byte) => {
      const hexByte = byte.charCodeAt(0).toString(16);
      return hexByte.length === 1 ? `0${hexByte}` : hexByte;
    })
    .join("");
  return hex;
}
