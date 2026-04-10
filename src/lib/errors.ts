export class HttpError extends Error {
  status: number
  details?: string

  constructor(status: number, message: string, details?: string) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
