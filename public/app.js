// API Configuration
const API_BASE = 'http://localhost:3001'
let token = localStorage.getItem('token')
let userId = localStorage.getItem('userId')
let currentBoardId = null
let currentCardId = null
let currentListId = null

// DOM Elements
const authSection = document.getElementById('authSection')
const appSection = document.getElementById('appSection')
const userDisplay = document.getElementById('userDisplay')
const logoutBtn = document.getElementById('logoutBtn')
const boardsList = document.getElementById('boardsList')
const boardView = document.getElementById('boardView')
const boardTitle = document.getElementById('boardTitle')
const listsContainer = document.getElementById('listsContainer')
const activityFeed = document.getElementById('activityFeed')
const activityList = document.getElementById('activityList')
const modalOverlay = document.getElementById('modalOverlay')

// Initialize
if (token && userId) {
  showApp()
  loadBoards()
} else {
  showAuth()
}

// Auth Handlers
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value

  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    
    if (res.ok) {
      token = data.token
      localStorage.setItem('token', token)
      
      // Decode token to get userId
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.userId
      localStorage.setItem('userId', userId)
      
      showApp()
      loadBoards()
    } else {
      alert('Login failed: ' + data.error)
    }
  } catch (err) {
    alert('Login error: ' + err.message)
  }
})

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('registerName').value
  const email = document.getElementById('registerEmail').value
  const password = document.getElementById('registerPassword').value

  try {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    const data = await res.json()
    
    if (res.ok) {
      alert('Registration successful! Please login.')
      document.getElementById('registerForm').reset()
    } else {
      alert('Registration failed: ' + data.error)
    }
  } catch (err) {
    alert('Registration error: ' + err.message)
  }
})

logoutBtn.addEventListener('click', () => {
  token = null
  userId = null
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  showAuth()
})

// Navigation
document.getElementById('createBoardBtn').addEventListener('click', () => {
  showModal('createBoardModal')
})

document.getElementById('backToBoards').addEventListener('click', () => {
  boardView.style.display = 'none'
  document.querySelector('.boards-section').style.display = 'block'
  loadBoards()
})

document.getElementById('viewActivityBtn').addEventListener('click', () => {
  loadActivity()
})

document.getElementById('closeActivity').addEventListener('click', () => {
  activityFeed.style.display = 'none'
})

// Board Handlers
document.getElementById('createBoardForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('boardName').value

  try {
    const res = await fetch(`${API_BASE}/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    })
    const data = await res.json()
    
    if (res.ok) {
      hideModal()
      document.getElementById('createBoardForm').reset()
      loadBoards()
    } else {
      alert('Failed to create board: ' + data.error)
    }
  } catch (err) {
    alert('Error: ' + err.message)
  }
})

// Card Handlers
document.getElementById('createCardForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const title = document.getElementById('cardTitle').value
  const description = document.getElementById('cardDescription').value || undefined

  try {
    const res = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, listId: currentListId })
    })
    const data = await res.json()
    
    if (res.ok) {
      hideModal()
      document.getElementById('createCardForm').reset()
      loadBoard(currentBoardId)
    } else {
      alert('Failed to create card: ' + data.error)
    }
  } catch (err) {
    alert('Error: ' + err.message)
  }
})

document.getElementById('addCommentForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const content = document.getElementById('commentContent').value

  try {
    const res = await fetch(`${API_BASE}/cards/${currentCardId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    })
    
    if (res.ok) {
      document.getElementById('commentContent').value = ''
      loadCardDetails(currentCardId)
    } else {
      const data = await res.json()
      alert('Failed to add comment: ' + data.error)
    }
  } catch (err) {
    alert('Error: ' + err.message)
  }
})

document.getElementById('deleteCardBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to delete this card?')) return

  try {
    const res = await fetch(`${API_BASE}/cards/${currentCardId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (res.ok) {
      hideModal()
      loadBoard(currentBoardId)
    } else {
      const data = await res.json()
      alert('Failed to delete card: ' + data.error)
    }
  } catch (err) {
    alert('Error: ' + err.message)
  }
})

// Modal Handlers
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', hideModal)
})

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) hideModal()
})

// Load Functions
async function loadBoards() {
  try {
    const res = await fetch(`${API_BASE}/boards`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const boards = await res.json()

    boardsList.innerHTML = boards.map(board => `
      <div class="board-card">
        <div onclick="openBoard(${board.id})" style="cursor: pointer;">
          <h3>${board.name}</h3>
          <p>Created: ${new Date(board.createdAt).toLocaleDateString()}</p>
        </div>
        <button class="btn-danger" style="margin-top: 10px; width: 100%;" onclick="deleteBoard(event, ${board.id})">Delete Board</button>
      </div>
    `).join('')
  } catch (err) {
    console.error('Failed to load boards:', err)
  }
}

async function loadBoard(id) {
  currentBoardId = id
  try {
    const res = await fetch(`${API_BASE}/boards/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const board = await res.json()
    
    if (res.ok) {
      boardTitle.textContent = board.name
      listsContainer.innerHTML = board.lists.map(list => `
        <div class="list">
          <h3>${list.name}</h3>
          <div class="cards-container">
            ${list.cards.map(card => `
              <div class="card" onclick="openCard(${card.id})" draggable="true" ondragstart="dragStart(event, ${card.id})" ondragend="dragEnd(event)">
                <h4>${card.title}</h4>
                ${card.description ? `<p>${card.description}</p>` : ''}
              </div>
            `).join('')}
          </div>
          <button class="add-card-btn" onclick="openCreateCard(${list.id})">+ Add Card</button>
        </div>
      `).join('')
      
      document.querySelector('.boards-section').style.display = 'none'
      boardView.style.display = 'block'
      activityFeed.style.display = 'none'
    }
  } catch (err) {
    console.error('Failed to load board:', err)
  }
}

async function loadActivity() {
  try {
    const res = await fetch(`${API_BASE}/boards/${currentBoardId}/activity`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const activities = await res.json()
    
    if (res.ok) {
      activityList.innerHTML = activities.map(activity => {
        let message = ''
        if (activity.eventType === 'card_created') {
          message = `<strong>${activity.actor.name}</strong> created card <em>${activity.card?.title || 'Unknown'}</em>`
        } else if (activity.eventType === 'card_moved') {
          message = `<strong>${activity.actor.name}</strong> moved <em>${activity.card?.title || 'Unknown'}</em> from <em>${activity.fromList?.name || 'Unknown'}</em> to <em>${activity.toList?.name || 'Unknown'}</em>`
        }
        
        return `
          <div class="activity-item">
            <div>${message}</div>
            <div class="time">${new Date(activity.createdAt).toLocaleString()}</div>
          </div>
        `
      }).join('')
      
      activityFeed.style.display = 'block'
    }
  } catch (err) {
    console.error('Failed to load activity:', err)
  }
}

async function loadCardDetails(id) {
  currentCardId = id
  try {
    const res = await fetch(`${API_BASE}/cards/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const card = await res.json()
    
    if (res.ok) {
      document.getElementById('cardDetailsTitle').textContent = card.title
      document.getElementById('cardDetailsDescription').textContent = card.description || 'No description'
      
      const commentsList = document.getElementById('commentsList')
      commentsList.innerHTML = card.comments.map(comment => `
        <div class="comment">
          <div class="author">User #${comment.userId}</div>
          <div class="content">${comment.content}</div>
        </div>
      `).join('') || '<p>No comments yet</p>'
    }
  } catch (err) {
    console.error('Failed to load card:', err)
  }
}

// Drag and Drop
let draggedCardId = null

function dragStart(event, cardId) {
  draggedCardId = cardId
  event.dataTransfer.effectAllowed = 'move'
}

function dragEnd(event) {
  draggedCardId = null
}

// Make lists drop zones
document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('dragover', (e) => {
    e.preventDefault()
  })
  
  document.body.addEventListener('drop', async (e) => {
    e.preventDefault()
    const list = e.target.closest('.list')
    if (list && draggedCardId) {
      const listName = list.querySelector('h3').textContent
      
      // Find the list ID by name (simplified approach)
      try {
        const res = await fetch(`${API_BASE}/boards/${currentBoardId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const board = await res.json()
        const targetList = board.lists.find(l => l.name === listName)
        
        if (targetList) {
          await fetch(`${API_BASE}/cards/${draggedCardId}/move`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ listId: targetList.id })
          })
          loadBoard(currentBoardId)
        }
      } catch (err) {
        console.error('Failed to move card:', err)
      }
    }
  })
})

// Helper Functions
function showAuth() {
  authSection.style.display = 'block'
  appSection.style.display = 'none'
  userDisplay.textContent = ''
  logoutBtn.style.display = 'none'
}

function showApp() {
  authSection.style.display = 'none'
  appSection.style.display = 'block'
  userDisplay.textContent = `User #${userId}`
  logoutBtn.style.display = 'block'
}

function showModal(modalId) {
  modalOverlay.style.display = 'flex'
  document.getElementById(modalId).style.display = 'block'
}

function hideModal() {
  modalOverlay.style.display = 'none'
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none'
  })
}

function openBoard(id) {
  loadBoard(id)
}

function openCreateCard(listId) {
  currentListId = listId
  showModal('createCardModal')
}

function openCard(id) {
  loadCardDetails(id)
  showModal('cardDetailsModal')
}

// Delete board function
async function deleteBoard(event, boardId) {
  event.stopPropagation()

  if (!confirm('Are you sure you want to delete this board? All lists and cards will be permanently deleted.')) {
    return
  }

  try {
    const res = await fetch(`${API_BASE}/boards/${boardId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (res.ok) {
      loadBoards()
    } else {
      const data = await res.json()
      alert('Failed to delete board: ' + data.error)
    }
  } catch (err) {
    alert('Error: ' + err.message)
  }
}
