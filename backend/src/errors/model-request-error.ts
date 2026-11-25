export class ModelRequestError extends Error {
  readonly statusCode: number;

  // Creates a model failure that carries the HTTP status the API should return.
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ModelRequestError";
    this.statusCode = statusCode;
  }
}
