export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}
