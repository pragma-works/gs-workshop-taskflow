import { useEffect, useState } from 'react'
import { getBoards, createBoard, type Board } from './api'

interface Props {
  onSelectBoard: (id: number) => void
  onLogout: () => void
}

const COLORS = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-red-600',
]

export default function BoardsPage({ onSelectBoard, onLogout }: Props) {
  const [boards, setBoards]       = useState<Board[]>([])
  const [loading, setLoading]     = useState(true)
  const [newName, setNewName]     = useState('')
  const [creating, setCreating]   = useState(false)
  const [showForm, setShowForm]   = useState(false)

  useEffect(() => {
    getBoards()
      .then(setBoards)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const board = await createBoard(newName.trim())
      setBoards(prev => [...prev, board])
      setNewName('')
      setShowForm(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <span className="text-white font-extrabold text-xl tracking-tight">TaskFlow</span>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-white/60 hover:text-white transition px-4 py-2 rounded-lg hover:bg-white/10"
        >
          Sign out
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-extrabold text-white">Your Boards</h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            <span className="text-lg">+</span> New Board
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="flex gap-3 mb-8">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Board name…"
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-400 transition"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-6 py-3 bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {creating ? '…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-3 text-white/50 hover:text-white rounded-xl transition">✕</button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-fuchsia-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {boards.map((board, i) => (
              <button
                key={board.id}
                onClick={() => onSelectBoard(board.id)}
                className={`bg-gradient-to-br ${COLORS[i % COLORS.length]} rounded-2xl p-6 text-left shadow-lg hover:scale-105 transition-transform cursor-pointer`}
              >
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-white font-extrabold text-lg truncate">{board.name}</h3>
                <p className="text-white/70 text-xs mt-1">
                  {new Date(board.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))}

            {boards.length === 0 && (
              <div className="col-span-3 text-center py-20 text-white/40">
                <div className="text-6xl mb-4">🗂️</div>
                <p className="text-lg">No boards yet. Create one above!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
