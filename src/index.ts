import app from './app'

// ANTI-PATTERN: no global error handler — every unhandled throw returns HTML 500
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))

export default app
