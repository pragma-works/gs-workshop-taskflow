import express from 'express'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'
import activityRouter from './routes/activity'
import { config } from './config'
import { requestLogger } from './middleware/requestLogger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { logger } from './logger'

const app = express()
app.use(express.json())
app.use(requestLogger)

app.get('/health', (req, res) => {
	res.json({ ok: true, uptime: process.uptime() })
})

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)  // Activity feed endpoints mounted under /boards
app.use('/cards',  cardsRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = config.port
app.listen(PORT, () => logger.info('taskflow server started', { port: PORT }))

export default app
