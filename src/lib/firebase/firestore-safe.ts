export function removeUndefined<T>(value: T): T {
  if (value === undefined) {
    return undefined as T;
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }

  if (value instanceof Date || value instanceof RegExp) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined) as T;
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child !== undefined) {
        output[key] = removeUndefined(child);
      }
    }

    return output as T;
  }

  return value;
}

export function assertNoUndefined(value: unknown, path = "root"): void {
  if (value === undefined) {
    throw new Error(`Undefined value detected at ${path}`);
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return;
  }

  if (value instanceof Date || value instanceof RegExp) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoUndefined(entry, `${path}[${index}]`));
    return;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      assertNoUndefined(child, `${path}.${key}`);
    }
  }
}
