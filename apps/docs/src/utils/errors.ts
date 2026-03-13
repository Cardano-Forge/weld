function hasProperty<P extends string>(obj: unknown, property: P): obj is { [K in P]: string } {
  return typeof obj === "object" && obj !== null && property in obj;
}

export function getFailureReason(error?: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error || hasProperty(error, "message")) {
    return error.message;
    // Wallet error
  }
  if (hasProperty(error, "info")) {
    return error.info;
  }
  if (typeof error === "string") {
    return error;
  }
  return undefined;
}
