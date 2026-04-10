import { createApp } from './app'
import { appConfig } from './config/env'

// ANTI-PATTERN: no global error handler — every unhandled throw returns HTML 500
const app = createApp()
const PORT = appConfig.port
app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))

export default app
