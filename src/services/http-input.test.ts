import { describe, expect, it } from 'vitest'
import { AppError } from '../errors/app-error'
import { parseId, requireString } from './http-input'

describe('http-input helpers', () => {
  it('parseId returns numeric id for valid value', () => {
    expect(parseId('42', 'id')).toBe(42)
  })

  it('parseId throws 400 for invalid value', () => {
    expect(() => parseId('abc', 'id')).toThrow(AppError)

    try {
      parseId('abc', 'id')
    } catch (error) {
      expect((error as AppError).statusCode).toBe(400)
      expect((error as AppError).message).toBe('id must be a number')
    }
  })

  it('requireString trims valid values', () => {
    expect(requireString('  board  ', 'name')).toBe('board')
  })

  it('requireString throws for empty values', () => {
    expect(() => requireString('   ', 'name')).toThrow(AppError)
    expect(() => requireString(undefined, 'name')).toThrow(AppError)
  })
})
