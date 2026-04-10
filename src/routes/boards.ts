import { Router, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import prisma from "../db";
import { boardRepository } from "../repositories/boardRepository";

const router = Router();

// ANTI-PATTERN: auth helper copy-pasted identically from users.ts and cards.ts
function verifyToken(req: Request): number {
  const header = req.headers.authorization;
  if (!header) throw new Error("No auth header");
  const token = header.replace("Bearer ", "");
  const secret = process.env.JWT_SECRET || "default-secret";
  const payload = jwt.verify(token, secret) as { userId: number };
  return payload.userId;
}

// ANTI-PATTERN: membership check inline in route handler
async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await boardRepository.findMembership(userId, boardId);
  return membership !== null;
}

// GET /boards — list boards for current user
router.get("/", async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const memberships = await boardRepository.findMembershipsByUser(userId);
  const boards = [];
  for (const m of memberships) {
    const board = await boardRepository.findById(m.boardId);
    boards.push(board);
  }
  res.json(boards);
});

// GET /boards/:id — full board with lists, cards, comments
router.get("/:id", async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const boardId = parseInt(req.params.id);
  const isMember = await checkMember(userId, boardId);
  if (!isMember) {
    res.status(403).json({ error: "Not a board member" });
    return;
  }

  const board = await boardRepository.findById(boardId);
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const lists = await boardRepository.findListsWithCardsAndDetails(boardId);
  res.json({ ...board, lists });
});

// POST /boards — create board
router.post("/", async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name } = req.body;
  const board = await boardRepository.createBoard({ name });
  await boardRepository.addMember({ userId, boardId: board.id, role: "owner" });
  res.status(201).json(board);
});

// POST /boards/:id/members — add member
router.post("/:id/members", async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const boardId = parseInt(req.params.id);
  const { memberId } = req.body;
  // ANTI-PATTERN: no check that current user is owner before adding members
  await prisma.boardMember.create({
    data: { userId: memberId, boardId, role: "member" },
  });
  res.status(201).json({ ok: true });
});

export default router;
