export const lovelaceToAda = (lovelace: number): number => lovelace / 1000000;

export const lovelaceToString = (number: number): string => {
  let n = number / 1_000_000; // Convert to ADA (from lovelace)
  let suffix = "";

  if (n >= 1e12) {
    suffix = "T";
    n /= 1e12;
  } else if (n >= 1e9) {
    suffix = "B";
    n /= 1e9;
  } else if (n >= 1e6) {
    suffix = "M";
    n /= 1e6;
  } else if (n >= 1e3) {
    suffix = "K";
    n /= 1e3;
  }

  let result = String(n);
  const parts = result.split(".");
  if (parts.length > 1) {
    const decimals = parts[1]?.substring(0, 1) ?? "";
    if (suffix && decimals.length > 0) {
      // Only append if there are decimals
      result = `${parts[0]}.${decimals}`;
    } else {
      result = parts[0] ?? ""; // No decimals to show
    }
  }

  return `${result}${suffix}`;
};
