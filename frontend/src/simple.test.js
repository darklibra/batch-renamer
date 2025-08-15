import { describe, it, expect } from 'vitest'

describe('Simple Test Suite', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should test string operations', () => {
    expect('hello world'.toUpperCase()).toBe('HELLO WORLD')
  })
})