import { useState } from 'react'
import LoginPage  from './LoginPage'
import BoardsPage from './BoardsPage'
import BoardPage  from './BoardPage'

type View = { page: 'login' } | { page: 'boards' } | { page: 'board'; boardId: number }

export default function App() {
  const [view, setView] = useState<View>(
    localStorage.getItem('token') ? { page: 'boards' } : { page: 'login' }
  )

  function handleLogin() { setView({ page: 'boards' }) }

  function handleLogout() {
    localStorage.removeItem('token')
    setView({ page: 'login' })
  }

  if (view.page === 'login')
    return <LoginPage onLogin={handleLogin} />

  if (view.page === 'board')
    return <BoardPage boardId={view.boardId} onBack={() => setView({ page: 'boards' })} />

  return (
    <BoardsPage
      onSelectBoard={id => setView({ page: 'board', boardId: id })}
      onLogout={handleLogout}
    />
  )
}
