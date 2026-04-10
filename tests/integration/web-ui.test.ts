import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestApplication, type TestApplication } from '../helpers/test-application'

describe('web UI integration', () => {
  let testApplication: TestApplication

  beforeEach(async () => {
    testApplication = await createTestApplication()
  })

  afterEach(async () => {
    await testApplication.cleanup()
  })

  it('serves the workspace UI shell and static assets', async () => {
    const htmlResponse = await request(testApplication.app).get('/')

    expect(htmlResponse.status).toBe(200)
    expect(htmlResponse.text).toContain('<title>Taskflow Workspace</title>')
    expect(htmlResponse.text).toContain('Minimal UI for authentication, boards, cards, and the board activity feed.')
    expect(htmlResponse.text).toContain('id="boards-list"')
    expect(htmlResponse.text).toContain('id="activity-list"')

    const scriptResponse = await request(testApplication.app).get('/app.js')

    expect(scriptResponse.status).toBe(200)
    expect(scriptResponse.text).toContain("/users/login")
    expect(scriptResponse.text).toContain("/boards/")

    const styleResponse = await request(testApplication.app).get('/app.css')

    expect(styleResponse.status).toBe(200)
    expect(styleResponse.text).toContain('.lists-grid')
    expect(styleResponse.text).toContain('.activity-list')
  })
})
