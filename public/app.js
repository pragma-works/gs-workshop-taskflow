(function () {
  const storage = window.sessionStorage
  const state = {
    activityEvents: [],
    boards: [],
    feedMode: storage.getItem('taskflow.feedMode') || 'full',
    selectedBoard: null,
    selectedBoardId: readStoredNumber('taskflow.boardId'),
    token: storage.getItem('taskflow.token') || '',
  }

  const elements = {
    activityList: document.getElementById('activity-list'),
    activityMode: document.getElementById('activity-mode'),
    boardName: document.getElementById('board-name'),
    boardSummary: document.getElementById('board-summary'),
    boardTitle: document.getElementById('board-title'),
    boardsList: document.getElementById('boards-list'),
    createBoardForm: document.getElementById('create-board-form'),
    listsGrid: document.getElementById('lists-grid'),
    loginForm: document.getElementById('login-form'),
    logoutButton: document.getElementById('logout-button'),
    refreshActivityButton: document.getElementById('refresh-activity-button'),
    refreshBoardButton: document.getElementById('refresh-board-button'),
    refreshBoardsButton: document.getElementById('refresh-boards-button'),
    registerForm: document.getElementById('register-form'),
    sessionLabel: document.getElementById('session-label'),
    statusMessage: document.getElementById('status-message'),
  }

  elements.activityMode.value = state.feedMode
  bindEvents()
  renderSession()
  renderBoards()
  renderBoard()
  renderActivity()

  if (state.token) {
    loadBoards().catch(handleError)
  }

  function bindEvents() {
    elements.registerForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(elements.registerForm)
      const payload = {
        email: String(formData.get('email') || '').trim(),
        name: String(formData.get('name') || '').trim(),
        password: String(formData.get('password') || ''),
      }

      try {
        await apiRequest('/users/register', {
          body: payload,
          method: 'POST',
        })
        setStatus('Account created. Signing you in...')
        await authenticate(payload.email, payload.password)
        elements.registerForm.reset()
      } catch (error) {
        handleError(error)
      }
    })

    elements.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(elements.loginForm)

      try {
        await authenticate(
          String(formData.get('email') || '').trim(),
          String(formData.get('password') || ''),
        )
        elements.loginForm.reset()
      } catch (error) {
        handleError(error)
      }
    })

    elements.logoutButton.addEventListener('click', () => {
      clearSession()
      setStatus('Signed out.')
    })

    elements.refreshBoardsButton.addEventListener('click', () => {
      loadBoards().catch(handleError)
    })

    elements.refreshBoardButton.addEventListener('click', () => {
      refreshSelectedBoard().catch(handleError)
    })

    elements.refreshActivityButton.addEventListener('click', () => {
      loadActivity().catch(handleError)
    })

    elements.createBoardForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(elements.createBoardForm)
      const name = String(formData.get('name') || '').trim()

      try {
        const board = await apiRequest('/boards', {
          auth: true,
          body: { name },
          method: 'POST',
        })
        elements.createBoardForm.reset()
        setStatus(`Board "${board.name}" created.`)
        await loadBoards(board.id)
      } catch (error) {
        handleError(error)
      }
    })

    elements.activityMode.addEventListener('change', async (event) => {
      state.feedMode = event.target.value
      storage.setItem('taskflow.feedMode', state.feedMode)

      try {
        await loadActivity()
      } catch (error) {
        handleError(error)
      }
    })
  }

  async function authenticate(email, password) {
    const result = await apiRequest('/users/login', {
      body: { email, password },
      method: 'POST',
    })

    state.token = result.token
    storage.setItem('taskflow.token', state.token)
    renderSession()
    setStatus('Signed in. Loading boards...')
    await loadBoards()
  }

  async function loadBoards(preferredBoardId) {
    if (!state.token) {
      renderBoards()
      return
    }

    state.boards = await apiRequest('/boards', { auth: true })
    renderBoards()

    if (state.boards.length === 0) {
      state.selectedBoard = null
      state.selectedBoardId = null
      storage.removeItem('taskflow.boardId')
      renderBoard()
      renderActivity()
      setStatus('No boards yet. Create one from the sidebar.')
      return
    }

    const nextBoardId =
      preferredBoardId ||
      state.selectedBoardId ||
      state.boards[0].id

    await selectBoard(nextBoardId)
  }

  async function selectBoard(boardId) {
    state.selectedBoardId = boardId
    storage.setItem('taskflow.boardId', String(boardId))
    renderBoards()
    await refreshSelectedBoard()
  }

  async function refreshSelectedBoard() {
    if (!state.selectedBoardId || !state.token) {
      renderBoard()
      return
    }

    state.selectedBoard = await apiRequest(`/boards/${state.selectedBoardId}`, { auth: true })
    renderBoard()
    await loadActivity()
    setStatus(`Loaded board "${state.selectedBoard.name}".`)
  }

  async function loadActivity() {
    if (!state.selectedBoardId) {
      renderActivity()
      return
    }

    const path =
      state.feedMode === 'preview'
        ? `/boards/${state.selectedBoardId}/activity/preview`
        : `/boards/${state.selectedBoardId}/activity`

    const result = await apiRequest(path, { auth: state.feedMode === 'full' })
    state.activityEvents = result.events
    renderActivity()
  }

  async function createCard(listId, title, description) {
    await apiRequest('/cards', {
      auth: true,
      body: {
        description: description || undefined,
        listId,
        title,
      },
      method: 'POST',
    })

    await refreshSelectedBoard()
    setStatus('Card created.')
  }

  async function moveCard(cardId, fromListId, targetListId) {
    const targetList = state.selectedBoard.lists.find((list) => list.id === targetListId)
    if (!targetList) {
      throw new Error('Target list not found.')
    }

    const position =
      targetList.id === fromListId
        ? Math.max(targetList.cards.length - 1, 0)
        : targetList.cards.length

    await apiRequest(`/cards/${cardId}/move`, {
      auth: true,
      body: {
        position,
        targetListId,
      },
      method: 'POST',
    })

    await refreshSelectedBoard()
    setStatus('Card moved.')
  }

  async function addComment(cardId, content) {
    await apiRequest(`/cards/${cardId}/comments`, {
      auth: true,
      body: { content },
      method: 'POST',
    })

    await refreshSelectedBoard()
    setStatus('Comment added.')
  }

  function renderSession() {
    elements.sessionLabel.textContent = state.token ? 'Signed in' : 'Signed out'
    elements.logoutButton.disabled = !state.token
  }

  function renderBoards() {
    elements.boardsList.replaceChildren()

    if (!state.token) {
      elements.boardsList.appendChild(createPlaceholder('Sign in to load your boards.', 'li'))
      return
    }

    if (state.boards.length === 0) {
      elements.boardsList.appendChild(
        createPlaceholder('No boards yet. Create one from the sidebar.', 'li'),
      )
      return
    }

    for (const board of state.boards) {
      const listItem = document.createElement('li')
      const button = document.createElement('button')
      button.className = board.id === state.selectedBoardId ? 'active' : ''
      button.type = 'button'
      button.textContent = board.name
      button.addEventListener('click', () => {
        selectBoard(board.id).catch(handleError)
      })
      listItem.appendChild(button)
      elements.boardsList.appendChild(listItem)
    }
  }

  function renderBoard() {
    elements.listsGrid.replaceChildren()

    if (!state.selectedBoard) {
      elements.boardTitle.textContent = 'No board selected'
      elements.boardSummary.textContent =
        'After signing in, choose a board to inspect lists, cards, and activity.'
      elements.listsGrid.appendChild(createPlaceholder('The board layout will appear here.'))
      return
    }

    elements.boardTitle.textContent = state.selectedBoard.name
    elements.boardSummary.textContent = `${state.selectedBoard.lists.length} lists loaded.`

    for (const list of state.selectedBoard.lists) {
      const column = document.createElement('section')
      column.className = 'list-column'

      const title = document.createElement('h3')
      title.textContent = list.name
      column.appendChild(title)

      const listMeta = document.createElement('p')
      listMeta.className = 'list-meta'
      listMeta.textContent = `${list.cards.length} cards`
      column.appendChild(listMeta)

      const cardList = document.createElement('div')
      cardList.className = 'card-list'

      if (list.cards.length === 0) {
        cardList.appendChild(createPlaceholder('No cards in this list yet.'))
      } else {
        for (const card of list.cards) {
          cardList.appendChild(createCardNode(card, list.id))
        }
      }

      column.appendChild(cardList)
      column.appendChild(createCardForm(list.id))
      elements.listsGrid.appendChild(column)
    }
  }

  function renderActivity() {
    elements.activityList.replaceChildren()

    if (!state.selectedBoardId) {
      elements.activityList.appendChild(
        createPlaceholder('Pick a board to load the latest events.', 'li'),
      )
      return
    }

    if (state.activityEvents.length === 0) {
      elements.activityList.appendChild(createPlaceholder('No activity recorded yet.', 'li'))
      return
    }

    for (const event of state.activityEvents) {
      const item = document.createElement('li')
      item.className = 'activity-item'

      const title = document.createElement('strong')
      title.textContent = formatActivityTitle(event)
      item.appendChild(title)

      const meta = document.createElement('p')
      meta.className = 'activity-meta'
      meta.textContent = `${new Date(event.createdAt).toLocaleString()} by user #${event.userId}`
      item.appendChild(meta)

      elements.activityList.appendChild(item)
    }
  }

  function createCardNode(card, fromListId) {
    const container = document.createElement('article')
    container.className = 'card-item'

    const title = document.createElement('h4')
    title.textContent = card.title
    container.appendChild(title)

    if (card.description) {
      const description = document.createElement('p')
      description.textContent = card.description
      container.appendChild(description)
    }

    const meta = document.createElement('p')
    meta.className = 'card-meta'
    meta.textContent = `Card #${card.id} · Position ${card.position}`
    container.appendChild(meta)

    if (card.labels.length > 0) {
      const labels = document.createElement('p')
      labels.className = 'card-meta'
      labels.textContent = `Labels: ${card.labels.map((label) => label.name).join(', ')}`
      container.appendChild(labels)
    }

    container.appendChild(createMoveForm(card.id, fromListId))
    container.appendChild(createCommentList(card.comments))
    container.appendChild(createCommentForm(card.id))

    return container
  }

  function createCardForm(listId) {
    const form = document.createElement('form')
    form.className = 'stack compact'

    const titleInput = document.createElement('input')
    titleInput.name = 'title'
    titleInput.placeholder = 'New card title'
    titleInput.required = true

    const descriptionInput = document.createElement('textarea')
    descriptionInput.name = 'description'
    descriptionInput.placeholder = 'Description'

    const button = document.createElement('button')
    button.type = 'submit'
    button.textContent = 'Add card'

    form.append(titleInput, descriptionInput, button)
    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      try {
        await createCard(listId, titleInput.value.trim(), descriptionInput.value.trim())
        form.reset()
      } catch (error) {
        handleError(error)
      }
    })

    return form
  }

  function createMoveForm(cardId, fromListId) {
    const form = document.createElement('form')
    form.className = 'card-actions'

    const select = document.createElement('select')
    for (const list of state.selectedBoard.lists) {
      const option = document.createElement('option')
      option.value = String(list.id)
      option.textContent = `Move to ${list.name}`
      if (list.id === fromListId) {
        option.selected = true
      }
      select.appendChild(option)
    }

    const button = document.createElement('button')
    button.className = 'secondary-button'
    button.type = 'submit'
    button.textContent = 'Move card'

    form.append(select, button)
    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      try {
        await moveCard(cardId, fromListId, Number.parseInt(select.value, 10))
      } catch (error) {
        handleError(error)
      }
    })

    return form
  }

  function createCommentList(comments) {
    const list = document.createElement('div')
    list.className = 'comment-list'

    if (comments.length === 0) {
      list.appendChild(createPlaceholder('No comments yet.'))
      return list
    }

    for (const comment of comments) {
      const item = document.createElement('div')
      item.className = 'comment-item'

      const title = document.createElement('strong')
      title.textContent = `User #${comment.userId}`
      item.appendChild(title)

      const content = document.createElement('p')
      content.textContent = comment.content
      item.appendChild(content)

      list.appendChild(item)
    }

    return list
  }

  function createCommentForm(cardId) {
    const form = document.createElement('form')
    form.className = 'stack compact'

    const input = document.createElement('textarea')
    input.name = 'content'
    input.placeholder = 'Add a comment'
    input.required = true

    const button = document.createElement('button')
    button.className = 'secondary-button'
    button.type = 'submit'
    button.textContent = 'Add comment'

    form.append(input, button)
    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      try {
        await addComment(cardId, input.value.trim())
        form.reset()
      } catch (error) {
        handleError(error)
      }
    })

    return form
  }

  function formatActivityTitle(event) {
    if (event.action === 'card_moved') {
      const fromListName = getListName(event.meta && event.meta.fromListId)
      const toListName = getListName(event.meta && event.meta.toListId)
      return `Card #${event.cardId} moved from ${fromListName} to ${toListName}.`
    }

    if (event.action === 'comment_added') {
      return `Comment added to card #${event.cardId}.`
    }

    return `Activity ${event.action}`
  }

  function getListName(listId) {
    if (!state.selectedBoard) {
      return `list #${listId}`
    }

    const list = state.selectedBoard.lists.find((entry) => entry.id === listId)
    return list ? list.name : `list #${listId}`
  }

  function createPlaceholder(message, tagName = 'div') {
    const item = document.createElement(tagName)
    item.className = 'placeholder'
    item.textContent = message
    return item
  }

  async function apiRequest(path, options) {
    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.auth && state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    }

    const response = await fetch(path, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers,
      method: options.method || 'GET',
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json') ? await response.json() : null

    if (!response.ok) {
      const message = payload && payload.error ? payload.error : `${response.status} ${response.statusText}`
      if (response.status === 401) {
        clearSession()
      }
      throw new Error(message)
    }

    return payload
  }

  function clearSession() {
    state.activityEvents = []
    state.boards = []
    state.selectedBoard = null
    state.selectedBoardId = null
    state.token = ''
    storage.removeItem('taskflow.token')
    storage.removeItem('taskflow.boardId')
    renderSession()
    renderBoards()
    renderBoard()
    renderActivity()
  }

  function handleError(error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    setStatus(message, true)
  }

  function setStatus(message, isError) {
    elements.statusMessage.textContent = message
    elements.statusMessage.style.color = isError ? '#b91c1c' : ''
  }

  function readStoredNumber(key) {
    const rawValue = storage.getItem(key)
    if (!rawValue) {
      return null
    }

    const parsedValue = Number.parseInt(rawValue, 10)
    return Number.isInteger(parsedValue) ? parsedValue : null
  }
})()
