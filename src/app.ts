import express from 'express'
import boardsRouter from './routes/boards'
import cardsRouter from './routes/cards'
import usersRouter from './routes/users'
import activityRouter from './routes/activity'
import { errorHandler } from './middleware/errorHandler'

const app = express()
app.use(express.json())

app.use('/users', usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards', cardsRouter)

app.use(errorHandler)

export default app
