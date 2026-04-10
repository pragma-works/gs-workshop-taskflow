import { createApp } from './app'
import { loadEnvironment } from './config/environment'
import { createApplicationServices } from './repositories/create-application-services'

const environment = loadEnvironment()
const app = createApp(createApplicationServices(environment.jwtSecret))

if (require.main === module) {
  app.listen(environment.port, () => {
    console.log(`taskflow running on :${environment.port}`)
  })
}

export default app
