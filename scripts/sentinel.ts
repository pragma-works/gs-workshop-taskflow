import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export interface SentinelViolation {
  readonly file: string
  readonly message: string
  readonly rule: string
}

export interface SentinelReport {
  readonly checkedFiles: number
  readonly ok: boolean
  readonly violations: readonly SentinelViolation[]
}

interface SentinelRule {
  readonly directory: string
  readonly message: string
  readonly name: string
  readonly forbiddenImports: readonly RegExp[]
}

const SENTINEL_RULES: readonly SentinelRule[] = [
  {
    directory: join('src', 'routes'),
    forbiddenImports: [
      /from ['"][^'"]*repositories\//,
      /from ['"][^'"]*db['"]/,
      /from ['"]@prisma\/client['"]/,
    ],
    message: 'Routes must depend on services and middleware, not repositories or database clients.',
    name: 'routes-layer',
  },
  {
    directory: join('src', 'services'),
    forbiddenImports: [
      /from ['"]express['"]/,
      /from ['"][^'"]*routes\//,
      /from ['"][^'"]*repositories\//,
      /from ['"]@prisma\/client['"]/,
    ],
    message: 'Services must stay framework-agnostic and avoid routes, repositories, and Prisma imports.',
    name: 'services-layer',
  },
  {
    directory: join('src', 'repositories'),
    forbiddenImports: [/from ['"]express['"]/, /from ['"][^'"]*routes\//],
    message: 'Repositories must not depend on HTTP routes or Express.',
    name: 'repositories-layer',
  },
]

export function runArchitectureSentinel(rootDirectory: string = process.cwd()): SentinelReport {
  const violations = SENTINEL_RULES.flatMap((rule) => findViolationsForRule(rootDirectory, rule))
  const checkedFiles = SENTINEL_RULES.reduce((total, rule) => {
    return total + collectTypeScriptFiles(join(rootDirectory, rule.directory)).length
  }, 0)

  return {
    checkedFiles,
    ok: violations.length === 0,
    violations,
  }
}

function findViolationsForRule(
  rootDirectory: string,
  rule: SentinelRule,
): readonly SentinelViolation[] {
  const files = collectTypeScriptFiles(join(rootDirectory, rule.directory))

  return files.flatMap((filePath) => {
    const fileContents = readFileSync(filePath, 'utf8')
    const hasForbiddenImport = rule.forbiddenImports.some((pattern) => pattern.test(fileContents))
    if (!hasForbiddenImport) {
      return []
    }

    return [
      {
        file: relative(rootDirectory, filePath).replace(/\\/g, '/'),
        message: rule.message,
        rule: rule.name,
      },
    ]
  })
}

function collectTypeScriptFiles(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return []
  }

  return readdirSync(directoryPath).flatMap((entryName) => {
    const entryPath = join(directoryPath, entryName)
    if (statSync(entryPath).isDirectory()) {
      return collectTypeScriptFiles(entryPath)
    }

    return entryPath.endsWith('.ts') ? [entryPath] : []
  })
}

function main(): void {
  const report = runArchitectureSentinel()

  if (report.ok) {
    console.log(`Architecture sentinel passed (${report.checkedFiles} files checked).`)
    return
  }

  console.error('Architecture sentinel failed:')
  for (const violation of report.violations) {
    console.error(`- [${violation.rule}] ${violation.file}: ${violation.message}`)
  }

  process.exitCode = 1
}

if (require.main === module) {
  main()
}
