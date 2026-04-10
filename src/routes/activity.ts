import { Router, Request, Response } from "express";
import { activityEventRepository } from "../repositories/activityEventRepository";
import { boardRepository } from "../repositories/boardRepository";
import * as jwt from "jsonwebtoken";

const router = Router();

function verifyToken(req: Request): number {
  const header = req.headers.authorization;
  if (!header) throw new Error("No auth header");
  const token = header.replace("Bearer ", "");
  const secret = process.env.JWT_SECRET || "default-secret";
  const payload = jwt.verify(token, secret) as { userId: number };
  return payload.userId;
}

async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await boardRepository.findMembership(userId, boardId);
  return membership !== null;
}

// GET /boards/:id/activity — requiere autenticación y ser miembro
router.get("/boards/:id/activity", async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const boardId = parseInt(req.params.id);
  const board = await boardRepository.findById(boardId);
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const isMember = await checkMember(userId, boardId);
  if (!isMember) {
    res.status(403).json({ error: "Not a board member" });
    return;
  }
  const events = await activityEventRepository.findByBoard(boardId);
  res.json({ events });
});

// GET /boards/:id/activity/preview — sin autenticación, últimos 10 eventos
router.get(
  "/boards/:id/activity/preview",
  async (req: Request, res: Response) => {
    try {
      const boardId = parseInt(req.params.id);
      const board = await boardRepository.findById(boardId);
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      const events = await activityEventRepository.findPreviewByBoard(
        boardId,
        10,
      );
      res.json({ events });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
