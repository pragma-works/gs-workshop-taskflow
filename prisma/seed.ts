import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('password123', 10)

  // Users
  const alice = await prisma.user.create({ data: { email: 'alice@test.com', password, name: 'Alice' } })
  const bob   = await prisma.user.create({ data: { email: 'bob@test.com',   password, name: 'Bob'   } })
  const carol = await prisma.user.create({ data: { email: 'carol@test.com', password, name: 'Carol' } })

  // Board
  const board = await prisma.board.create({ data: { name: 'Q2 Product Sprint' } })

  // Members
  await prisma.boardMember.createMany({
    data: [
      { userId: alice.id, boardId: board.id, role: 'owner' },
      { userId: bob.id,   boardId: board.id, role: 'member' },
      { userId: carol.id, boardId: board.id, role: 'member' },
    ],
  })

  // Lists (columns)
  const backlog = await prisma.list.create({ data: { name: 'Backlog',     position: 0, boardId: board.id } })
  const inProgress = await prisma.list.create({ data: { name: 'In Progress', position: 1, boardId: board.id } })
  const done = await prisma.list.create({ data: { name: 'Done',         position: 2, boardId: board.id } })

  // Labels
  const bugLabel     = await prisma.label.create({ data: { name: 'bug',     color: '#e11d48' } })
  const featureLabel = await prisma.label.create({ data: { name: 'feature', color: '#7c3aed' } })

  // Cards in Backlog
  const card1 = await prisma.card.create({
    data: { title: 'User auth flow',         position: 0, listId: backlog.id,     assigneeId: alice.id },
  })
  const card2 = await prisma.card.create({
    data: { title: 'Dashboard widget',       position: 1, listId: backlog.id,     assigneeId: bob.id },
  })
  const card3 = await prisma.card.create({
    data: { title: 'Fix login redirect',     position: 0, listId: inProgress.id,  assigneeId: carol.id },
  })
  const card4 = await prisma.card.create({
    data: { title: 'Profile page',           position: 1, listId: inProgress.id,  assigneeId: alice.id },
  })
  const card5 = await prisma.card.create({
    data: { title: 'Landing page redesign',  position: 0, listId: done.id,        assigneeId: bob.id },
  })

  // Card labels
  await prisma.cardLabel.createMany({
    data: [
      { cardId: card1.id, labelId: featureLabel.id },
      { cardId: card3.id, labelId: bugLabel.id },
      { cardId: card4.id, labelId: featureLabel.id },
      { cardId: card5.id, labelId: featureLabel.id },
    ],
  })

  // Comments — multiple per card so N+1 is measurable
  await prisma.comment.createMany({
    data: [
      { content: 'Should we use OAuth?',           cardId: card1.id, userId: alice.id },
      { content: 'I like the password flow for now', cardId: card1.id, userId: bob.id },
      { content: 'Keep it simple, OAuth later',    cardId: card1.id, userId: carol.id },
      { content: 'Wireframes in Figma',            cardId: card2.id, userId: bob.id },
      { content: 'Approved the wireframes',        cardId: card2.id, userId: alice.id },
      { content: 'Regression from last week',      cardId: card3.id, userId: carol.id },
      { content: 'Confirmed — affects prod',       cardId: card3.id, userId: alice.id },
      { content: 'Hotfix deployed',                cardId: card3.id, userId: carol.id },
      { content: 'Add avatar upload here',         cardId: card4.id, userId: bob.id },
      { content: 'Mobile viewport looks off',      cardId: card4.id, userId: carol.id },
      { content: 'Shipped to prod Friday',         cardId: card5.id, userId: alice.id },
    ],
  })

  console.log('Seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
