// Global state
let token = null
let currentUserId = null
let currentBoardId = null
let boards = []
let boardData = null

// API Base
const API_BASE = 'http://localhost:3001'

// ============================================
// Authentication
// ============================================

async function login() {
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const errorDiv = document.getElementById('authError')
    
    try {
        const response = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        
        if (!response.ok) {
            throw new Error('Invalid credentials')
        }
        
        const data = await response.json()
        token = data.token
        
        // Decode token to get userId
        const parsed = JSON.parse(atob(token.split('.')[1]))
        currentUserId = parsed.userId
        
        // Show app section
        document.getElementById('authSection').style.display = 'none'
        document.getElementById('appSection').style.display = 'flex'
        document.getElementById('userName').textContent = email
        
        // Load boards
        await loadBoards()
        
        // Clear form
        document.getElementById('loginForm').reset()
    } catch (error) {
        errorDiv.textContent = error.message
        errorDiv.classList.add('show')
        setTimeout(() => errorDiv.classList.remove('show'), 3000)
    }
}

function logout() {
    token = null
    currentUserId = null
    currentBoardId = null
    boards = []
    boardData = null
    
    document.getElementById('authSection').style.display = 'flex'
    document.getElementById('appSection').style.display = 'none'
    document.getElementById('loginForm').reset()
}

// ============================================
// Boards
// ============================================

async function loadBoards() {
    try {
        const response = await fetch(`${API_BASE}/boards`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (!response.ok) throw new Error('Failed to load boards')
        
        boards = await response.json()
        
        const select = document.getElementById('boardSelect')
        select.innerHTML = ''
        
        boards.forEach(board => {
            const option = document.createElement('option')
            option.value = board.id
            option.textContent = board.name
            select.appendChild(option)
        })
        
        if (boards.length > 0) {
            select.value = boards[0].id
            await loadBoard(boards[0].id)
        }
    } catch (error) {
        console.error('Error loading boards:', error)
    }
}

async function loadBoard(boardId) {
    currentBoardId = boardId
    
    try {
        const response = await fetch(`${API_BASE}/boards/${boardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (!response.ok) throw new Error('Failed to load board')
        
        boardData = await response.json()
        
        renderKanban()
        loadActivity()
    } catch (error) {
        console.error('Error loading board:', error)
    }
}

// ============================================
// Kanban Board Rendering
// ============================================

function renderKanban() {
    if (!boardData) return
    
    const kanban = document.getElementById('kanban')
    kanban.innerHTML = ''
    
    boardData.lists.forEach(list => {
        const listDiv = document.createElement('div')
        listDiv.className = 'kanban-list'
        
        const title = document.createElement('h3')
        title.textContent = list.name
        listDiv.appendChild(title)
        
        const cardsContainer = document.createElement('div')
        cardsContainer.className = 'cards-container'
        
        list.cards.forEach(card => {
            const cardDiv = document.createElement('div')
            cardDiv.className = 'kanban-card'
            cardDiv.draggable = true
            cardDiv.dataset.cardId = card.id
            cardDiv.dataset.listId = list.id
            
            const title = document.createElement('div')
            title.className = 'card-title'
            title.textContent = card.title
            
            const meta = document.createElement('div')
            meta.className = 'card-meta'
            
            const comments = document.createElement('span')
            comments.textContent = `💬 ${card.comments.length}`
            
            const actions = document.createElement('div')
            actions.className = 'card-actions'
            
            const moveBtn = document.createElement('button')
            moveBtn.className = 'card-btn'
            moveBtn.textContent = '→'
            moveBtn.title = 'Move to next list'
            moveBtn.onclick = (e) => {
                e.stopPropagation()
                showMoveOptions(card, list)
            }
            
            const commentBtn = document.createElement('button')
            commentBtn.className = 'card-btn'
            commentBtn.textContent = '┃'
            commentBtn.title = 'Add comment'
            commentBtn.onclick = (e) => {
                e.stopPropagation()
                openCommentModal(card.id)
            }
            
            actions.appendChild(moveBtn)
            actions.appendChild(commentBtn)
            
            meta.appendChild(comments)
            meta.appendChild(actions)
            
            cardDiv.appendChild(title)
            cardDiv.appendChild(meta)
            
            // Drag events
            cardDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('cardId', card.id)
                e.dataTransfer.setData('fromListId', list.id)
            })
            
            cardsContainer.appendChild(cardDiv)
        })
        
        // Drop zone
        cardsContainer.addEventListener('dragover', (e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
        })
        
        cardsContainer.addEventListener('drop', (e) => {
            e.preventDefault()
            const cardId = parseInt(e.dataTransfer.getData('cardId'))
            const fromListId = parseInt(e.dataTransfer.getData('fromListId'))
            
            if (list.id !== fromListId) {
                moveCard(cardId, list.id)
            }
        })
        
        listDiv.appendChild(cardsContainer)
        kanban.appendChild(listDiv)
    })
}

function showMoveOptions(card, currentList) {
    const lists = boardData.lists.filter(l => l.id !== currentList.id)
    
    if (lists.length === 0) {
        alert('No other lists available')
        return
    }
    
    const options = lists.map(l => `${l.name} (${l.id})`).join('\n')
    const choice = prompt(`Move "${card.title}" to:\n\n${options}`)
    
    if (choice) {
        const listId = parseInt(choice.split('(')[1].split(')')[0])
        moveCard(card.id, listId)
    }
}

async function moveCard(cardId, targetListId) {
    try {
        const response = await fetch(`${API_BASE}/cards/${cardId}/move`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetListId,
                position: 0
            })
        })
        
        if (!response.ok) throw new Error('Failed to move card')
        
        // Reload board to show changes
        await loadBoard(currentBoardId)
    } catch (error) {
        console.error('Error moving card:', error)
        alert('Failed to move card')
    }
}

// ============================================
// Comments
// ============================================

let currentCommentCardId = null

function openCommentModal(cardId) {
    currentCommentCardId = cardId
    document.getElementById('commentModal').style.display = 'flex'
    document.getElementById('commentText').focus()
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none'
    document.getElementById('commentForm').reset()
    currentCommentCardId = null
}

async function addComment(event) {
    event.preventDefault()
    
    const content = document.getElementById('commentText').value
    
    try {
        const response = await fetch(`${API_BASE}/cards/${currentCommentCardId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        })
        
        if (!response.ok) throw new Error('Failed to add comment')
        
        closeCommentModal()
        await loadBoard(currentBoardId)
    } catch (error) {
        console.error('Error adding comment:', error)
        alert('Failed to add comment')
    }
}

// ============================================
// Activity Feed
// ============================================

async function loadActivity() {
    if (!currentBoardId) return
    
    try {
        const response = await fetch(`${API_BASE}/boards/${currentBoardId}/activity`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (!response.ok) throw new Error('Failed to load activity')
        
        const data = await response.json()
        renderActivity(data.events)
    } catch (error) {
        console.error('Error loading activity:', error)
    }
}

function renderActivity(events) {
    const feed = document.getElementById('activityFeed')
    
    if (events.length === 0) {
        feed.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">No activity yet</div>'
        return
    }
    
    feed.innerHTML = events.map(event => {
        const time = new Date(event.createdAt)
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        
        let actionText = ''
        let details = ''
        
        if (event.action === 'card_moved') {
            const meta = JSON.parse(event.meta || '{}')
            actionText = '📍 Card Moved'
            details = `${event.card?.title || 'Card'} moved to a new list`
        } else if (event.action === 'comment_added') {
            actionText = '💬 Comment Added'
            details = `Comment on ${event.card?.title || 'Card'}`
        }
        
        return `
            <div class="activity-item">
                <div class="activity-action">${actionText}</div>
                <div class="activity-details">${details}</div>
                <div class="activity-time">by ${event.user?.name || 'Unknown'} • ${timeStr}</div>
            </div>
        `
    }).join('')
}

// ============================================
// Event Listeners
// ============================================

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault()
    login()
})

document.getElementById('logoutBtn').addEventListener('click', logout)

document.getElementById('boardSelect').addEventListener('change', (e) => {
    if (e.target.value) {
        loadBoard(parseInt(e.target.value))
    }
})

document.getElementById('refreshActivityBtn').addEventListener('click', loadActivity)

document.getElementById('commentForm').addEventListener('submit', addComment)

document.querySelector('.modal-close').addEventListener('click', closeCommentModal)

document.getElementById('commentModal').addEventListener('click', (e) => {
    if (e.target.id === 'commentModal') closeCommentModal()
})

// Close comment modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('commentModal').style.display === 'flex') {
        closeCommentModal()
    }
})

// Focus on email field on page load
window.addEventListener('load', () => {
    document.getElementById('email').focus()
})
