import 'dotenv/config'
import express from 'express'
import { config } from './config'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import activityRouter from './routes/activity'
import usersRouter  from './routes/users'
import { errorHandler } from './errors'

const app = express()
app.use(express.json({ limit: '1mb' }))

app.use('/users',  usersRouter)
app.use('/boards', activityRouter)
app.use('/boards', boardsRouter)
app.use('/cards',  cardsRouter)

app.use(errorHandler)

app.listen(config.port, () => console.log(`taskflow running on :${config.port}`))

export default app
