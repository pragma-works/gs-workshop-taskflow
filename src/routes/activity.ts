import { Request, Response, Router } from 'express'

const router = Router()

router.get('/:id/activity', (req: Request, res: Response) => {
  if (!req.headers.authorization) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  res.json({ events: [] })
})

export default router
