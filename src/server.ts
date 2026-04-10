import app from './index'
import { config } from './config'

app.listen(config.port, () => console.log(`taskflow running on :${config.port}`))
