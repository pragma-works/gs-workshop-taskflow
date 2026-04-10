const BASE = ''

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const login = (email: string, password: string) =>
  api<{ token: string }>('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const getBoards = () => api<Board[]>('/boards')

export const getBoard = (id: number) => api<BoardDetail>(`/boards/${id}`)

export const createBoard = (name: string) =>
  api<Board>('/boards', { method: 'POST', body: JSON.stringify({ name }) })

export const moveCard = (cardId: number, targetListId: number, position: number) =>
  api<{ ok: boolean; event: ActivityEvent }>(`/cards/${cardId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ targetListId, position }),
  })

export const getActivity = (boardId: number) =>
  api<ActivityEvent[]>(`/boards/${boardId}/activity`)

export const addComment = (cardId: number, content: string) =>
  api<Comment>(`/cards/${cardId}/comments`, { method: 'POST', body: JSON.stringify({ content }) })

// ---- Types ----------------------------------------------------------------

export interface Board {
  id: number
  name: string
  createdAt: string
}

export interface Comment {
  id: number
  content: string
  userId: number
  cardId: number
  createdAt: string
}

export interface Card {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: string | null
  listId: number
  assigneeId: number | null
  createdAt: string
  comments: Comment[]
  labels: Label[]
}

export interface Label {
  id: number
  name: string
  color: string
}

export interface List {
  id: number
  name: string
  position: number
  boardId: number
  cards: Card[]
}

export interface BoardDetail extends Board {
  lists: List[]
}

export interface ActivityEvent {
  id: number
  boardId: number
  actorId: number
  eventType: string
  cardId: number | null
  fromListId: number | null
  toListId: number | null
  createdAt: string
  actorName: string
  cardTitle: string | null
  fromListName: string | null
  toListName: string | null
}
