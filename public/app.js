/* ─── State ───────────────────────────────────────────────────────────────────── */
const state = {
  token: localStorage.getItem('tf_token'),
  currentBoard: null,
  activityOpen: false,
  activity: [],
  currentCardId: null,
  addCardListId: null,
}

/* ─── API helpers ─────────────────────────────────────────────────────────────── */
async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`
  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) { logout(); return null }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  } catch (e) {
    toast(e.message, 'danger')
    return null
  }
}

/* ─── Utils ───────────────────────────────────────────────────────────────────── */
function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function toast(msg, type = 'success') {
  document.querySelectorAll('.tf-toast').forEach(n => n.remove())
  const colours = { success: '#48c78e', danger: '#f14668', info: '#3e8ed0', warning: '#ffe08a' }
  const textColours = { warning: '#363636' }
  const n = document.createElement('div')
  n.className = 'tf-toast'
  n.style.background = colours[type] || colours.info
  n.style.color = textColours[type] || '#fff'
  n.textContent = msg
  document.body.appendChild(n)
  setTimeout(() => n.remove(), 3200)
}

function timeAgo(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function navigate(hash) { location.hash = hash }
function logout() { state.token = null; localStorage.removeItem('tf_token'); navigate('/') }
function closeModal(id) { document.getElementById(id)?.classList.remove('is-active') }
function openModal(id) { document.getElementById(id)?.classList.add('is-active') }

/* ─── Router ──────────────────────────────────────────────────────────────────── */
async function router() {
  const hash = location.hash.replace('#', '') || '/'

  if (!state.token && hash !== '/') { navigate('/'); return }
  if (state.token && hash === '/') { navigate('/boards'); return }

  if (hash === '/') { renderAuth(); return }
  if (hash === '/boards') { await renderDashboard(); return }

  const m = hash.match(/^\/boards\/(\d+)$/)
  if (m) { await renderBoard(parseInt(m[1])); return }

  navigate(state.token ? '/boards' : '/')
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AUTH VIEW
═══════════════════════════════════════════════════════════════════════════════ */
function renderAuth() {
  document.getElementById('app').innerHTML = `
    <section class="hero is-fullheight tf-hero-bg">
      <div class="hero-body">
        <div class="container">
          <div class="columns is-centered">
            <div class="column is-5-tablet is-4-desktop is-3-widescreen">
              <div class="box tf-auth-box">

                <div class="has-text-centered mb-5">
                  <span class="icon is-large" style="color:#485fc7">
                    <i class="fas fa-th-large fa-2x"></i>
                  </span>
                  <p class="title is-3 mt-3 mb-1">Taskflow</p>
                  <p class="subtitle is-6 has-text-grey">Kanban boards, beautifully simple</p>
                </div>

                <div class="tabs is-boxed is-fullwidth mb-4" id="auth-tabs">
                  <ul>
                    <li class="is-active" id="tab-login">
                      <a onclick="switchTab('login')">
                        <span class="icon is-small"><i class="fas fa-sign-in-alt"></i></span>
                        <span>Sign in</span>
                      </a>
                    </li>
                    <li id="tab-register">
                      <a onclick="switchTab('register')">
                        <span class="icon is-small"><i class="fas fa-user-plus"></i></span>
                        <span>Create account</span>
                      </a>
                    </li>
                  </ul>
                </div>

                <!-- Login -->
                <div id="form-login">
                  <div class="field">
                    <label class="label">Email</label>
                    <div class="control has-icons-left">
                      <input id="login-email" class="input" type="email" placeholder="you@example.com" autocomplete="email">
                      <span class="icon is-left"><i class="fas fa-envelope"></i></span>
                    </div>
                  </div>
                  <div class="field">
                    <label class="label">Password</label>
                    <div class="control has-icons-left">
                      <input id="login-password" class="input" type="password" placeholder="••••••••" autocomplete="current-password">
                      <span class="icon is-left"><i class="fas fa-lock"></i></span>
                    </div>
                  </div>
                  <div class="field mt-5">
                    <button id="btn-login" class="button is-link is-fullwidth is-medium" onclick="doLogin()">
                      <span class="icon"><i class="fas fa-sign-in-alt"></i></span>
                      <span>Sign in</span>
                    </button>
                  </div>
                </div>

                <!-- Register -->
                <div id="form-register" style="display:none">
                  <div class="field">
                    <label class="label">Full name</label>
                    <div class="control has-icons-left">
                      <input id="reg-name" class="input" type="text" placeholder="Alice Smith" autocomplete="name">
                      <span class="icon is-left"><i class="fas fa-user"></i></span>
                    </div>
                  </div>
                  <div class="field">
                    <label class="label">Email</label>
                    <div class="control has-icons-left">
                      <input id="reg-email" class="input" type="email" placeholder="you@example.com" autocomplete="email">
                      <span class="icon is-left"><i class="fas fa-envelope"></i></span>
                    </div>
                  </div>
                  <div class="field">
                    <label class="label">Password</label>
                    <div class="control has-icons-left">
                      <input id="reg-password" class="input" type="password" placeholder="••••••••" autocomplete="new-password">
                      <span class="icon is-left"><i class="fas fa-lock"></i></span>
                    </div>
                  </div>
                  <div class="field mt-5">
                    <button id="btn-register" class="button is-success is-fullwidth is-medium" onclick="doRegister()">
                      <span class="icon"><i class="fas fa-user-plus"></i></span>
                      <span>Create account</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `

  // Enter-key support
  ;['login-email', 'login-password'].forEach(id =>
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() })
  )
  ;['reg-name', 'reg-email', 'reg-password'].forEach(id =>
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister() })
  )
}

function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('is-active', tab === 'login')
  document.getElementById('tab-register').classList.toggle('is-active', tab === 'register')
  document.getElementById('form-login').style.display = tab === 'login' ? '' : 'none'
  document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none'
}

async function doLogin() {
  const email    = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  if (!email || !password) { toast('Please fill in all fields.', 'warning'); return }
  const btn = document.getElementById('btn-login')
  btn.classList.add('is-loading')
  const data = await api('POST', '/users/login', { email, password })
  btn.classList.remove('is-loading')
  if (data?.token) {
    state.token = data.token
    localStorage.setItem('tf_token', data.token)
    navigate('/boards')
  }
}

async function doRegister() {
  const name     = document.getElementById('reg-name').value.trim()
  const email    = document.getElementById('reg-email').value.trim()
  const password = document.getElementById('reg-password').value
  if (!name || !email || !password) { toast('Please fill in all fields.', 'warning'); return }
  const btn = document.getElementById('btn-register')
  btn.classList.add('is-loading')
  const data = await api('POST', '/users/register', { name, email, password })
  btn.classList.remove('is-loading')
  if (data) {
    toast('Account created! Sign in to continue.')
    switchTab('login')
    document.getElementById('login-email').value = email
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DASHBOARD VIEW
═══════════════════════════════════════════════════════════════════════════════ */
async function renderDashboard() {
  document.getElementById('app').innerHTML = `
    ${navbarHTML()}
    <div class="tf-dashboard">
      <section class="section">
        <div class="container">
          <div class="level mb-5">
            <div class="level-left">
              <div>
                <p class="title is-4 mb-1">
                  <span class="icon has-text-link mr-1"><i class="fas fa-th-large"></i></span>
                  My Boards
                </p>
                <p class="subtitle is-6 has-text-grey">Pick up where you left off</p>
              </div>
            </div>
          </div>
          <div id="boards-grid" class="columns is-multiline">
            <div class="column is-12 has-text-centered py-6">
              <span class="icon is-large has-text-grey-light">
                <i class="fas fa-spinner fa-pulse fa-2x"></i>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- New board modal -->
    <div id="modal-new-board" class="modal">
      <div class="modal-background" onclick="closeModal('modal-new-board')"></div>
      <div class="modal-card" style="max-width:440px;width:95%">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <span class="icon has-text-link mr-2"><i class="fas fa-plus-circle"></i></span>
            New Board
          </p>
          <button class="delete" onclick="closeModal('modal-new-board')"></button>
        </header>
        <section class="modal-card-body">
          <div class="field">
            <label class="label">Board name</label>
            <div class="control has-icons-left">
              <input id="new-board-name" class="input is-medium" type="text" placeholder="e.g. Product Roadmap">
              <span class="icon is-left"><i class="fas fa-th-large"></i></span>
            </div>
          </div>
        </section>
        <footer class="modal-card-foot" style="gap:0.75rem">
          <button class="button is-link" onclick="createBoard()">
            <span class="icon"><i class="fas fa-plus"></i></span>
            <span>Create board</span>
          </button>
          <button class="button" onclick="closeModal('modal-new-board')">Cancel</button>
        </footer>
      </div>
    </div>
  `

  document.getElementById('new-board-name')
    .addEventListener('keydown', e => { if (e.key === 'Enter') createBoard() })

  const boards = await api('GET', '/boards')
  if (!boards) return

  const grid = document.getElementById('boards-grid')
  const colours = ['color-0','color-1','color-2','color-3','color-4','color-5']
  const items = boards.map((b, i) => `
    <div class="column is-3-widescreen is-4-desktop is-6-tablet">
      <div class="tf-board-card ${colours[i % colours.length]}" onclick="navigate('/boards/${b.id}')">
        <div class="card-content">
          <p class="title is-5 has-text-white mb-2">${esc(b.name)}</p>
          <p class="is-size-7 has-text-white" style="opacity:0.7">
            <span class="icon is-small"><i class="fas fa-columns"></i></span>
            Open board →
          </p>
        </div>
      </div>
    </div>
  `).join('')

  grid.innerHTML = items + `
    <div class="column is-3-widescreen is-4-desktop is-6-tablet">
      <div class="tf-new-board-card" onclick="openModal('modal-new-board')">
        <span class="icon is-large" style="font-size:1.75rem"><i class="fas fa-plus"></i></span>
        <span class="is-size-7 has-text-weight-medium">Create new board</span>
      </div>
    </div>
  `

  if (boards.length === 0) {
    grid.innerHTML = `
      <div class="column is-12">
        <div class="has-text-centered py-6">
          <p class="has-text-grey mb-4">You don't have any boards yet.</p>
          <button class="button is-link is-medium" onclick="openModal('modal-new-board')">
            <span class="icon"><i class="fas fa-plus"></i></span>
            <span>Create your first board</span>
          </button>
        </div>
      </div>
    `
  }
}

async function createBoard() {
  const name = document.getElementById('new-board-name').value.trim()
  if (!name) { toast('Please enter a board name.', 'warning'); return }
  const board = await api('POST', '/boards', { name })
  if (board) { closeModal('modal-new-board'); navigate(`/boards/${board.id}`) }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BOARD VIEW
═══════════════════════════════════════════════════════════════════════════════ */
async function renderBoard(boardId) {
  document.getElementById('app').innerHTML = `
    ${navbarHTML()}
    <div class="tf-board-wrapper">
      <div class="tf-board-header">
        <a class="button is-small is-dark" style="border:1px solid rgba(255,255,255,0.2)" onclick="navigate('/boards')">
          <span class="icon is-small"><i class="fas fa-arrow-left"></i></span>
          <span>Boards</span>
        </a>
        <span id="board-title" class="tf-board-name">Loading…</span>
        <div style="margin-left:auto;display:flex;gap:0.5rem">
          <button class="button is-small is-dark" style="border:1px solid rgba(255,255,255,0.2)" onclick="toggleActivity()">
            <span class="icon is-small"><i class="fas fa-stream"></i></span>
            <span>Activity</span>
          </button>
          <button class="button is-small is-dark" onclick="refreshBoard(${boardId})" title="Refresh">
            <span class="icon is-small"><i class="fas fa-sync-alt"></i></span>
          </button>
        </div>
      </div>
      <div class="tf-lists-scroll" id="lists-scroll">
        <div class="tf-spinner">
          <span class="icon is-large" style="color:rgba(255,255,255,0.4)">
            <i class="fas fa-spinner fa-pulse fa-2x"></i>
          </span>
        </div>
      </div>
    </div>

    <!-- Activity panel -->
    <div id="activity-panel" class="tf-activity-panel">
      <div class="tf-activity-header">
        <span class="icon has-text-link is-small"><i class="fas fa-stream"></i></span>
        <span class="tf-activity-header-title">Activity Feed</span>
        <button class="delete" onclick="toggleActivity()"></button>
      </div>
      <div id="activity-list" class="tf-activity-list">
        <p class="has-text-grey-light p-4 is-size-7">Loading activity…</p>
      </div>
    </div>

    <!-- Add card modal -->
    <div id="modal-add-card" class="modal">
      <div class="modal-background" onclick="closeModal('modal-add-card')"></div>
      <div class="modal-card" style="max-width:480px;width:95%">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <span class="icon has-text-link mr-2"><i class="fas fa-plus"></i></span>
            Add Card
          </p>
          <button class="delete" onclick="closeModal('modal-add-card')"></button>
        </header>
        <section class="modal-card-body">
          <div class="field">
            <label class="label">Title <span class="has-text-danger">*</span></label>
            <div class="control">
              <input id="add-card-title" class="input" type="text" placeholder="What needs to be done?">
            </div>
          </div>
          <div class="field">
            <label class="label">Description <span class="has-text-grey-light is-size-7">(optional)</span></label>
            <div class="control">
              <textarea id="add-card-desc" class="textarea" rows="3" placeholder="Add more context…"></textarea>
            </div>
          </div>
        </section>
        <footer class="modal-card-foot" style="gap:0.75rem">
          <button class="button is-link" onclick="submitAddCard()">
            <span class="icon"><i class="fas fa-plus"></i></span>
            <span>Add card</span>
          </button>
          <button class="button" onclick="closeModal('modal-add-card')">Cancel</button>
        </footer>
      </div>
    </div>

    <!-- Card detail modal -->
    <div id="modal-card-detail" class="modal">
      <div class="modal-background" onclick="closeModal('modal-card-detail')"></div>
      <div class="modal-card" style="max-width:580px;width:95%">
        <header class="modal-card-head">
          <p class="modal-card-title" id="detail-title" style="font-size:1rem"></p>
          <button class="delete" onclick="closeModal('modal-card-detail')"></button>
        </header>
        <section class="modal-card-body" style="max-height:60vh;overflow-y:auto">
          <p id="detail-desc" class="has-text-grey is-size-7 mb-4"></p>
          <hr style="margin:0.75rem 0">
          <p class="title is-6 mb-3">
            <span class="icon has-text-link is-small"><i class="fas fa-comment-alt"></i></span>
            Comments
          </p>
          <div id="detail-comments" class="mb-4"></div>
          <div class="field has-addons">
            <div class="control is-expanded">
              <input id="detail-comment-input" class="input" type="text" placeholder="Write a comment…">
            </div>
            <div class="control">
              <button id="detail-comment-btn" class="button is-link" onclick="submitComment()">Post</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `

  await loadBoard(boardId)
  loadActivity(boardId)
}

async function loadBoard(boardId) {
  const board = await api('GET', `/boards/${boardId}`)
  if (!board) return

  state.currentBoard = board
  document.getElementById('board-title').textContent = board.name

  const scroll = document.getElementById('lists-scroll')
  if (!board.lists || board.lists.length === 0) {
    scroll.innerHTML = `
      <div class="tf-empty">
        <i class="fas fa-columns"></i>
        <p>This board has no lists yet.</p>
        <p class="is-size-7">Lists are created via the API (POST /boards/:id/lists)</p>
      </div>
    `
    return
  }

  scroll.innerHTML = ''
  board.lists.forEach(list => scroll.appendChild(buildColumn(list)))
}

async function refreshBoard(boardId) {
  const btn = document.querySelector(`button[onclick="refreshBoard(${boardId})"] i`)
  if (btn) btn.classList.add('fa-spin')
  await loadBoard(boardId)
  await loadActivity(boardId)
  if (btn) btn.classList.remove('fa-spin')
  toast('Board refreshed')
}

function buildColumn(list) {
  const col = document.createElement('div')
  col.className = 'tf-column'
  col.innerHTML = `
    <div class="tf-column-header">
      <span class="tf-column-title">${esc(list.name)}</span>
      <span class="tf-column-count" id="count-${list.id}">${list.cards.length}</span>
    </div>
    <div class="tf-cards-list" id="list-${list.id}" data-list-id="${list.id}">
      ${list.cards.map(c => cardHTML(c)).join('')}
    </div>
    <button class="tf-add-card-btn" onclick="openAddCard(${list.id})">
      <span class="icon is-small"><i class="fas fa-plus"></i></span>
      <span>Add card</span>
    </button>
  `

  Sortable.create(col.querySelector(`#list-${list.id}`), {
    group: 'cards',
    animation: 180,
    ghostClass: 'tf-card-ghost',
    chosenClass: 'tf-card-chosen',
    onEnd: handleCardDrop,
  })

  return col
}

function cardHTML(card) {
  const commentCount = card.comments?.length ?? 0
  const hasDue = card.dueDate
  const footer = (commentCount > 0 || hasDue) ? `
    <div class="tf-card-footer">
      ${hasDue ? `<span class="tf-card-chip" style="color:#e08030">
        <i class="fas fa-clock"></i>${new Date(hasDue).toLocaleDateString()}</span>` : ''}
      ${commentCount > 0 ? `<span class="tf-card-chip">
        <i class="fas fa-comment"></i>${commentCount}</span>` : ''}
    </div>
  ` : ''

  return `
    <div class="tf-card" data-card-id="${card.id}" onclick="openCardDetail(${card.id})">
      <p class="tf-card-title">${esc(card.title)}</p>
      ${card.description ? `<p class="tf-card-desc">${esc(card.description.slice(0, 90))}${card.description.length > 90 ? '…' : ''}</p>` : ''}
      ${footer}
    </div>
  `
}

async function handleCardDrop(evt) {
  const cardId   = parseInt(evt.item.dataset.cardId)
  const toListId = parseInt(evt.to.dataset.listId)
  const fromListId = parseInt(evt.from.dataset.listId)
  const position = evt.newIndex

  if (toListId === fromListId && evt.oldIndex === evt.newIndex) return

  const result = await api('PATCH', `/cards/${cardId}/move`, { targetListId: toListId, position })
  if (result?.ok) {
    updateColumnCounts()
    loadActivity(state.currentBoard.id)
    toast('Card moved ✓')
  }
}

function updateColumnCounts() {
  document.querySelectorAll('.tf-cards-list').forEach(el => {
    const listId = el.dataset.listId
    const count  = el.children.length
    const badge  = document.getElementById(`count-${listId}`)
    if (badge) badge.textContent = count
  })
}

/* ─── Add card ─────────────────────────────────────────────────────────────── */
function openAddCard(listId) {
  state.addCardListId = listId
  document.getElementById('add-card-title').value = ''
  document.getElementById('add-card-desc').value  = ''
  openModal('modal-add-card')
  setTimeout(() => document.getElementById('add-card-title').focus(), 100)
  document.getElementById('add-card-title').onkeydown = e => { if (e.key === 'Enter') submitAddCard() }
}

async function submitAddCard() {
  const title = document.getElementById('add-card-title').value.trim()
  const desc  = document.getElementById('add-card-desc').value.trim()
  if (!title) { toast('Please enter a card title.', 'warning'); return }

  const card = await api('POST', '/cards', {
    title, description: desc || undefined, listId: state.addCardListId,
  })
  if (!card) return

  closeModal('modal-add-card')

  // Inject card into DOM without full reload
  const list = document.getElementById(`list-${state.addCardListId}`)
  if (list) {
    list.insertAdjacentHTML('beforeend', cardHTML({ ...card, comments: [], labels: [] }))
    updateColumnCounts()
    // Sync state
    const stateList = state.currentBoard?.lists.find(l => l.id === state.addCardListId)
    if (stateList) stateList.cards.push({ ...card, comments: [], labels: [] })
  }
  toast('Card added ✓')
}

/* ─── Card detail ──────────────────────────────────────────────────────────── */
function openCardDetail(cardId) {
  state.currentCardId = cardId
  let card = null
  for (const list of (state.currentBoard?.lists ?? [])) {
    card = list.cards.find(c => c.id === cardId)
    if (card) break
  }
  if (!card) return

  document.getElementById('detail-title').textContent = card.title
  document.getElementById('detail-desc').textContent  = card.description || 'No description.'
  renderComments(card.comments ?? [])
  openModal('modal-card-detail')
  document.getElementById('detail-comment-input').onkeydown = e => { if (e.key === 'Enter') submitComment() }
}

function renderComments(comments) {
  const el = document.getElementById('detail-comments')
  if (!comments.length) {
    el.innerHTML = '<p class="has-text-grey-light is-size-7">No comments yet. Be the first!</p>'
    return
  }
  el.innerHTML = comments.map(c => `
    <div class="media mb-3">
      <div class="media-left">
        <span class="icon has-text-link"><i class="fas fa-user-circle fa-lg"></i></span>
      </div>
      <div class="media-content">
        <p class="mb-0 is-size-7">${esc(c.content)}</p>
        <p class="has-text-grey is-size-7">${timeAgo(c.createdAt)}</p>
      </div>
    </div>
  `).join('')
}

async function submitComment() {
  const input = document.getElementById('detail-comment-input')
  const content = input.value.trim()
  if (!content || !state.currentCardId) return

  const btn = document.getElementById('detail-comment-btn')
  btn.classList.add('is-loading')
  const comment = await api('POST', `/cards/${state.currentCardId}/comments`, { content })
  btn.classList.remove('is-loading')

  if (comment) {
    input.value = ''
    for (const list of (state.currentBoard?.lists ?? [])) {
      const card = list.cards.find(c => c.id === state.currentCardId)
      if (card) { card.comments = [...(card.comments ?? []), comment]; renderComments(card.comments); break }
    }
  }
}

/* ─── Activity feed ────────────────────────────────────────────────────────── */
async function loadActivity(boardId) {
  const events = await api('GET', `/boards/${boardId}/activity/preview`)
  if (!events) return
  state.activity = events
  renderActivity()
}

function renderActivity() {
  const list = document.getElementById('activity-list')
  if (!list) return

  if (!state.activity.length) {
    list.innerHTML = '<p class="has-text-grey-light p-4 is-size-7">No activity yet. Move a card to see events here.</p>'
    return
  }

  list.innerHTML = state.activity.map(e => `
    <div class="tf-event-item">
      <div class="tf-event-icon">
        <span class="icon has-text-link is-small"><i class="fas fa-arrows-alt"></i></span>
      </div>
      <div class="tf-event-body">
        <p class="is-size-7 mb-1">
          <strong>${esc(e.actorName)}</strong> moved
          <em>${esc(e.cardTitle || 'a card')}</em>
        </p>
        ${e.fromListName && e.toListName ? `
          <p class="is-size-7 mb-1" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
            <span class="tf-list-pill">${esc(e.fromListName)}</span>
            <span class="icon is-small has-text-grey" style="font-size:0.6rem"><i class="fas fa-arrow-right"></i></span>
            <span class="tf-list-pill is-to">${esc(e.toListName)}</span>
          </p>
        ` : ''}
        <p class="is-size-7 has-text-grey">${timeAgo(e.createdAt)}</p>
      </div>
    </div>
  `).join('')
}

function toggleActivity() {
  const panel = document.getElementById('activity-panel')
  if (panel) panel.classList.toggle('is-open')
}

/* ─── Navbar ───────────────────────────────────────────────────────────────── */
function navbarHTML() {
  return `
    <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <a class="navbar-item" onclick="navigate('/boards')" style="cursor:pointer">
          <span class="icon has-text-link mr-1"><i class="fas fa-th-large"></i></span>
          <strong class="has-text-white">Taskflow</strong>
        </a>
      </div>
      <div class="navbar-end">
        <div class="navbar-item">
          <button class="button is-small is-dark" style="border:1px solid rgba(255,255,255,0.2)" onclick="logout()">
            <span class="icon is-small"><i class="fas fa-sign-out-alt"></i></span>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  `
}

/* ─── Init ─────────────────────────────────────────────────────────────────── */
window.addEventListener('hashchange', router)
window.addEventListener('load', router)
