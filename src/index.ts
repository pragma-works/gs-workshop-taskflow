import express from 'express'
import path from 'path'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'
import { getPort } from './config'

const app = express()
app.use(express.json())
app.use(express.static(path.join(process.cwd(), 'public')))

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/cards',  cardsRouter)

app.get('/', (_req, res) => {
	res.sendFile(path.join(process.cwd(), 'public', 'index.html'))
})

if (process.env.NODE_ENV !== 'test') {
	const port = getPort()
	app.listen(port, () => console.log(`taskflow running on :${port}`))
}

export default app
