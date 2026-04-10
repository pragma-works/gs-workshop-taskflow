type LogLevel = 'INFO' | 'WARN' | 'ERROR'

function write(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(metadata ? { metadata } : {}),
  }

  const line = JSON.stringify(payload)
  if (level === 'ERROR') {
    console.error(line)
    return
  }

  console.log(line)
}

export const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    write('INFO', message, metadata)
  },
  warn(message: string, metadata?: Record<string, unknown>) {
    write('WARN', message, metadata)
  },
  error(message: string, metadata?: Record<string, unknown>) {
    write('ERROR', message, metadata)
  },
}
