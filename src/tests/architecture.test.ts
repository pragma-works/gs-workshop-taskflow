import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

describe('Architecture constraints', () => {
  it('no route file imports prisma directly', () => {
    const routesDir = join(__dirname, '..', 'routes')
    const files = readdirSync(routesDir).filter(f => f.endsWith('.ts'))

    for (const file of files) {
      const content = readFileSync(join(routesDir, file), 'utf8')
      expect(content).not.toMatch(/import.*from.*['"]\.\.\/db['"]/)
      expect(content).not.toMatch(/\bprisma\b/)
    }
  })

  it('auth middleware is not duplicated in route files', () => {
    const routesDir = join(__dirname, '..', 'routes')
    const files = readdirSync(routesDir).filter(f => f.endsWith('.ts'))

    for (const file of files) {
      const content = readFileSync(join(routesDir, file), 'utf8')
      expect(content).not.toMatch(/jwt\.verify/)
      expect(content).not.toMatch(/super-secret-key/)
    }
  })
})
