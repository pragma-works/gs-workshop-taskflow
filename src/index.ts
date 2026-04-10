import { createApp } from './app'
import { getAppConfig } from './config'

const app = createApp()
const { port } = getAppConfig()

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`taskflow running on :${port}`))
}

export default app
