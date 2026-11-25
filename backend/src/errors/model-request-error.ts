export class ModelRequestError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ModelRequestError";
    this.statusCode = statusCode;
  }
}
