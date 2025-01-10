export const hexToString = (s: string) => {
  const hex = s.toString();
  let str = "";
  for (let n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(Number.parseInt(hex.substring(n, n + 2), 16));
  }
  return str;
};
