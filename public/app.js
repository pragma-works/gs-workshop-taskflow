const state = {
  token: '',
}

const authState = document.getElementById('auth-state')
const boardsEl = document.getElementById('boards')
const boardView = document.getElementById('board-view')
const activityView = document.getElementById('activity-view')
const boardIdInput = document.getElementById('board-id')
const toast = document.getElementById('toast')

function showToast(message, kind = 'success') {
  toast.textContent = message
  toast.className = `toast show ${kind}`
  window.setTimeout(() => {
    toast.className = 'toast'
  }, 2200)
}

function jsonPretty(value) {
  return JSON.stringify(value, null, 2)
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`
  }

  const response = await fetch(path, { ...options, headers })
  const text = await response.text()
  const body = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new Error(body.error || `HTTP ${response.status}`)
  }

  return body
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  try {
    const payload = await api('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    })

    state.token = payload.token
    authState.textContent = `Token activo: ${state.token.slice(0, 16)}...`
    showToast('Login correcto')
  } catch (error) {
    showToast(error.message, 'error')
  }
})

document.getElementById('load-boards').addEventListener('click', async () => {
  try {
    const boards = await api('/boards')
    boardsEl.innerHTML = ''

    if (!Array.isArray(boards) || boards.length === 0) {
      boardsEl.innerHTML = '<span class="muted">No hay boards para este usuario</span>'
      return
    }

    boards.forEach((board) => {
      const chip = document.createElement('button')
      chip.className = 'chip'
      chip.textContent = `#${board.id} ${board.name}`
      chip.addEventListener('click', () => {
        boardIdInput.value = String(board.id)
      })
      boardsEl.appendChild(chip)
    })

    showToast('Boards cargados')
  } catch (error) {
    showToast(error.message, 'error')
  }
})

document.getElementById('load-board').addEventListener('click', async () => {
  try {
    const boardId = Number(boardIdInput.value)
    if (!boardId) throw new Error('Board ID invalido')

    const board = await api(`/boards/${boardId}`)
    boardView.textContent = jsonPretty(board)
    showToast('Detalle de board actualizado')
  } catch (error) {
    showToast(error.message, 'error')
  }
})

document.getElementById('load-activity').addEventListener('click', async () => {
  try {
    const boardId = Number(boardIdInput.value)
    if (!boardId) throw new Error('Board ID invalido')

    const activity = await api(`/boards/${boardId}/activity`)
    activityView.textContent = jsonPretty(activity)
    showToast('Activity privada cargada')
  } catch (error) {
    showToast(error.message, 'error')
  }
})

document.getElementById('load-preview').addEventListener('click', async () => {
  try {
    const boardId = Number(boardIdInput.value)
    if (!boardId) throw new Error('Board ID invalido')

    const activity = await api(`/boards/${boardId}/activity/preview`, {
      headers: {},
    })
    activityView.textContent = jsonPretty(activity)
    showToast('Preview cargado')
  } catch (error) {
    showToast(error.message, 'error')
  }
})

document.getElementById('move-form').addEventListener('submit', async (event) => {
  event.preventDefault()

  try {
    const cardId = Number(document.getElementById('move-card-id').value)
    const targetListId = Number(document.getElementById('target-list-id').value)
    const position = Number(document.getElementById('move-position').value)

    await api(`/cards/${cardId}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetListId, position }),
    })

    showToast('Tarjeta movida y evento creado')
  } catch (error) {
    showToast(error.message, 'error')
  }
})

document.getElementById('comment-form').addEventListener('submit', async (event) => {
  event.preventDefault()

  try {
    const cardId = Number(document.getElementById('comment-card-id').value)
    const content = document.getElementById('comment-content').value

    await api(`/cards/${cardId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })

    showToast('Comentario creado y evento registrado')
  } catch (error) {
    showToast(error.message, 'error')
  }
})
