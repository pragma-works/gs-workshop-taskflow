export class HttpError extends Error {
  public readonly statusCode: number

  /**
   * @param statusCode HTTP status code.
   * @param message Public-safe error message.
   */
  public constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'HttpError'
  }
}
