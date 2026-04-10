import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { runArchitectureSentinel } from '../../scripts/sentinel'

const temporaryDirectories: string[] = []

describe('architecture sentinel', () => {
  afterEach(() => {
    for (const directoryPath of temporaryDirectories.splice(0)) {
      rmSync(directoryPath, { force: true, recursive: true })
    }
  })

  it('passes when route, service, and repository boundaries are respected', () => {
    const rootDirectory = createFixtureRoot()

    writeSourceFile(
      rootDirectory,
      'src/routes/users.ts',
      "import type { UsersService } from '../services/users-service'\n",
    )
    writeSourceFile(
      rootDirectory,
      'src/services/users-service.ts',
      "import type { UserRecord } from '../domain/models'\n",
    )
    writeSourceFile(
      rootDirectory,
      'src/repositories/user-repository.ts',
      "import type { PrismaClient } from '@prisma/client'\n",
    )

    const report = runArchitectureSentinel(rootDirectory)

    expect(report.ok).toBe(true)
    expect(report.violations).toHaveLength(0)
    expect(report.checkedFiles).toBe(3)
  })

  it('flags repositories imported from routes', () => {
    const rootDirectory = createFixtureRoot()

    writeSourceFile(
      rootDirectory,
      'src/routes/users.ts',
      "import { PrismaUserRepository } from '../repositories/prisma-user-repository'\n",
    )

    const report = runArchitectureSentinel(rootDirectory)

    expect(report.ok).toBe(false)
    expect(report.violations).toEqual([
      expect.objectContaining({
        file: 'src/routes/users.ts',
        rule: 'routes-layer',
      }),
    ])
  })

  it('flags framework imports inside services', () => {
    const rootDirectory = createFixtureRoot()

    writeSourceFile(rootDirectory, 'src/services/users-service.ts', "import { Router } from 'express'\n")

    const report = runArchitectureSentinel(rootDirectory)

    expect(report.ok).toBe(false)
    expect(report.violations).toEqual([
      expect.objectContaining({
        file: 'src/services/users-service.ts',
        rule: 'services-layer',
      }),
    ])
  })
})

function createFixtureRoot(): string {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'taskflow-sentinel-'))
  temporaryDirectories.push(rootDirectory)
  return rootDirectory
}

function writeSourceFile(rootDirectory: string, relativeFilePath: string, content: string): void {
  const fullDirectoryPath = dirname(join(rootDirectory, relativeFilePath))
  mkdirSync(fullDirectoryPath, { recursive: true })
  writeFileSync(join(rootDirectory, relativeFilePath), content)
}
