import express from 'express'
import activityRouter from './routes/activity'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'

const app = express()
app.use(express.json())

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

// ANTI-PATTERN: no global error handler — every unhandled throw returns HTML 500
const PORT = process.env.PORT || 3001

if (require.main === module) {
	app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))
}

export default app
