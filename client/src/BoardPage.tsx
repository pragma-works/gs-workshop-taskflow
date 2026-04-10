import { useEffect, useState, useCallback } from 'react'
import { getBoard, getActivity, moveCard, type BoardDetail, type ActivityEvent, type Card, type List } from './api'
import ActivityFeed from './ActivityFeed'

interface Props {
  boardId: number
  onBack: () => void
}

const LIST_COLORS = [
  'from-violet-600/30 to-purple-700/20 border-violet-500/30',
  'from-cyan-600/30 to-blue-700/20 border-cyan-500/30',
  'from-fuchsia-600/30 to-pink-700/20 border-fuchsia-500/30',
  'from-emerald-600/30 to-teal-700/20 border-emerald-500/30',
  'from-amber-600/30 to-orange-700/20 border-amber-500/30',
]

const LABEL_COLORS: Record<string, string> = {
  '#e11d48': 'bg-rose-500',
  '#7c3aed': 'bg-violet-600',
  '#0891b2': 'bg-cyan-600',
  '#16a34a': 'bg-green-600',
  '#d97706': 'bg-amber-500',
}

function labelClass(color: string) {
  return LABEL_COLORS[color] ?? 'bg-slate-500'
}

function CardTile({ card, lists, onMoved }: { card: Card; lists: List[]; onMoved: () => void }) {
  const [moving, setMoving] = useState(false)
  const [showMove, setShowMove] = useState(false)

  async function handleMove(targetListId: number) {
    setMoving(true)
    setShowMove(false)
    try {
      await moveCard(card.id, targetListId, 0)
      onMoved()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Move failed')
    } finally {
      setMoving(false)
    }
  }

  return (
    <div className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-3 transition group relative">
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map(l => (
            <span key={l.id} className={`${labelClass(l.color)} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      <p className="text-white text-sm font-semibold leading-snug">{card.title}</p>

      {card.description && (
        <p className="text-white/50 text-xs mt-1 line-clamp-2">{card.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-white/40 text-xs">
          {card.comments.length > 0 && (
            <span className="flex items-center gap-1">💬 {card.comments.length}</span>
          )}
          {card.dueDate && (
            <span className="flex items-center gap-1 text-amber-400">
              📅 {new Date(card.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Move button */}
        <div className="relative">
          <button
            onClick={() => setShowMove(v => !v)}
            disabled={moving}
            className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-fuchsia-500/30 hover:bg-fuchsia-500/60 text-fuchsia-200 rounded-lg transition"
          >
            {moving ? '…' : 'Move'}
          </button>
          {showMove && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-white/20 rounded-xl shadow-2xl py-1 min-w-[140px]">
              {lists
                .filter(l => l.id !== card.listId)
                .map(l => (
                  <button
                    key={l.id}
                    onClick={() => handleMove(l.id)}
                    className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
                  >
                    → {l.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BoardPage({ boardId, onBack }: Props) {
  const [board, setBoard]       = useState<BoardDetail | null>(null)
  const [events, setEvents]     = useState<ActivityEvent[]>([])
  const [loadingBoard, setLoadingBoard]   = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)

  const fetchBoard = useCallback(() => {
    return getBoard(boardId).then(setBoard)
  }, [boardId])

  const fetchEvents = useCallback(() => {
    setLoadingEvents(true)
    return getActivity(boardId)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoadingEvents(false))
  }, [boardId])

  useEffect(() => {
    fetchBoard().finally(() => setLoadingBoard(false))
    fetchEvents()
  }, [fetchBoard, fetchEvents])

  function handleMoved() {
    fetchBoard()
    fetchEvents()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex flex-col">
      {/* Top nav */}
      <nav className="flex items-center gap-4 px-6 py-3 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-white/60 hover:text-white transition text-sm flex items-center gap-1"
        >
          ← Boards
        </button>
        <span className="text-white/20">|</span>
        <span className="text-white font-bold truncate">{board?.name ?? '…'}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/30">{board?.lists.reduce((n, l) => n + l.cards.length, 0) ?? 0} cards</span>
        </div>
      </nav>

      {/* Body: kanban + activity */}
      <div className="flex flex-1 overflow-hidden">
        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto p-6">
          {loadingBoard ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-fuchsia-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="flex gap-5 h-full" style={{ minWidth: `${(board?.lists.length ?? 1) * 280}px` }}>
              {board?.lists.map((list, i) => (
                <div key={list.id} className="flex flex-col w-64 flex-shrink-0">
                  {/* Column header */}
                  <div className={`bg-gradient-to-b ${LIST_COLORS[i % LIST_COLORS.length]} border rounded-2xl p-3 mb-3`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-sm uppercase tracking-wider">{list.name}</h3>
                      <span className="bg-white/20 text-white/80 text-xs font-bold px-2 py-0.5 rounded-full">
                        {list.cards.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
                    {list.cards
                      .sort((a, b) => a.position - b.position)
                      .map(card => (
                        <CardTile
                          key={card.id}
                          card={card}
                          lists={board.lists}
                          onMoved={handleMoved}
                        />
                      ))}
                    {list.cards.length === 0 && (
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center text-white/20 text-xs">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed sidebar */}
        <ActivityFeed events={events} loading={loadingEvents} />
      </div>
    </div>
  )
}
