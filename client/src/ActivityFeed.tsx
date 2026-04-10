import { type ActivityEvent } from './api'

interface Props {
  events: ActivityEvent[]
  loading: boolean
}

const EVENT_ICONS: Record<string, string> = {
  card_moved: '🚀',
  comment_added: '💬',
  card_created: '✨',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ActivityFeed({ events, loading }: Props) {
  return (
    <div className="w-80 min-w-[20rem] bg-slate-900/80 backdrop-blur border-l border-white/10 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <h3 className="text-white font-bold text-sm uppercase tracking-widest">Activity Feed</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No activity yet.<br/>Move a card to get started!</p>
        ) : (
          events.map(ev => (
            <div key={ev.id} className="flex gap-3 group">
              {/* icon blob */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-sm shadow">
                {EVENT_ICONS[ev.eventType] ?? '📌'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-xs leading-snug">
                  <span className="font-semibold text-fuchsia-300">{ev.actorName}</span>
                  {' '}moved{' '}
                  {ev.cardTitle && (
                    <span className="font-semibold text-cyan-300">"{ev.cardTitle}"</span>
                  )}
                </p>
                {ev.fromListName && ev.toListName && (
                  <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/60">{ev.fromListName}</span>
                    <span>→</span>
                    <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">{ev.toListName}</span>
                  </p>
                )}
                <p className="text-white/25 text-xs mt-1">{timeAgo(ev.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
