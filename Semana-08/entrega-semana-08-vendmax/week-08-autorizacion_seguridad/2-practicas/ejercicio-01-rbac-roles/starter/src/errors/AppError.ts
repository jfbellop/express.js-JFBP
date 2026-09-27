// AppError is a typed error class for HTTP errors
// Using a class allows instanceof checks in the error handler middleware
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    // Restore prototype chain (required when extending Error in TypeScript)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
