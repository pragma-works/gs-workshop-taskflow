import { Router, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import prisma from "../db";
import { activityEventRepository } from "../repositories/activityEventRepository";
import { cardRepository } from "../repositories/cardRepository";

const router = Router();

function verifyToken(req: Request): number {
  const header = req.headers.authorization;
  if (!header) throw new Error("No auth header");
  const token = header.replace("Bearer ", "");
  const secret = process.env.JWT_SECRET || "default-secret";
  const payload = jwt.verify(token, secret) as { userId: number };
  return payload.userId;
}

// GET /cards/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const card = await cardRepository.findById(parseInt(req.params.id));
  if (!card) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const comments = await cardRepository.findComments(card.id);
  const labels = await cardRepository.findLabels(card.id);
  res.json({ ...card, comments, labels });
});

// POST /cards — create card
router.post("/", async (req: Request, res: Response) => {
  try {
    verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { title, description, listId, assigneeId } = req.body;
  // ANTI-PATTERN: position not calculated — just appended with no ordering logic
  const count = await cardRepository.countInList(listId);
  const card = await cardRepository.createCard({
    title,
    description,
    listId,
    assigneeId,
    position: count,
  });
  res.status(201).json(card);
});

// PATCH /cards/:id/move — move card to different list y registrar ActivityEvent
router.patch("/:id/move", async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const cardId = parseInt(req.params.id);
  const { targetListId, position } = req.body;

  const card = await cardRepository.findById(cardId);
  if (!card) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const fromListId = card.listId;
  const boardId = (
    await prisma.list.findUnique({ where: { id: targetListId } })
  )?.boardId;
  if (!boardId) {
    res.status(400).json({ error: "Target list not found" });
    return;
  }

  // Transacción: mover la tarjeta y registrar el evento
  await prisma.$transaction([
    cardRepository.updateCard(cardId, { listId: targetListId, position }),
    prisma.activityEvent.create({
      data: {
        boardId,
        cardId,
        userId,
        action: "card_moved",
        meta: { fromListId, toListId: targetListId, position },
      },
    }),
  ]);

  res.json({ ok: true });
});

// POST /cards/:id/comments — add comment y registrar ActivityEvent
router.post("/:id/comments", async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { content } = req.body;
  const cardId = parseInt(req.params.id);
  const card = await cardRepository.findById(cardId);
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  const boardId = (await prisma.list.findUnique({ where: { id: card.listId } }))
    ?.boardId;
  if (!boardId) {
    res.status(400).json({ error: "Board not found for card" });
    return;
  }
  // Transacción: crear comentario y registrar evento
  const [comment] = await prisma.$transaction([
    prisma.comment.create({ data: { content, cardId, userId } }),
    prisma.activityEvent.create({
      data: {
        boardId,
        cardId,
        userId,
        action: "comment_added",
        meta: { content },
      },
    }),
  ]);
  res.status(201).json(comment);
});

// DELETE /cards/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    verifyToken(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const cardId = parseInt(req.params.id);
  // ANTI-PATTERN: no ownership check — any authenticated user can delete any card
  await cardRepository.deleteCard(cardId);
  res.json({ ok: true });
});

export default router;
