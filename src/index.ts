import express from 'express'
import path from 'path'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'

const app = express()
app.use(express.json())

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/cards',  cardsRouter)

// ANTI-PATTERN: no global error handler — every unhandled throw returns HTML 500
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))

export default app
