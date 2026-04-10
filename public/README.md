# Taskflow UI

A simple, modern web application for managing Kanban boards with real-time activity tracking.

## 🚀 Features

- **User Authentication** - Login with email and password
- **Kanban Board** - Visual drag-and-drop board with lists and cards
- **Card Management** - Move cards between lists and add comments
- **Activity Feed** - Real-time activity tracking showing card movements and comments
- **Responsive Design** - Works on desktop and tablet

## 📁 Files

- `public/index.html` - Main UI structure
- `public/style.css` - Styling and responsive layout
- `public/app.js` - API integration and DOM interactions

## 🎯 Quick Start

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3001
   ```

3. Login with test credentials:
   - Email: `alice@test.com`
   - Password: `password123`

## 🎨 UI Components

### Authentication Screen
- Email and password input fields
- Pre-filled test credentials for easy testing
- Error handling with user-friendly messages

### Main App
- **Header** - Board selector and user info
- **Kanban Board** (Left side)
  - Three lists: Backlog, In Progress, Done
  - Cards show title, comment count, and action buttons
  - Drag cards between lists to move them
  - Click "→" to show list options or drag directly
  - Click "┃" to add a comment

- **Activity Feed** (Right sidebar)
  - Shows all activity on the current board
  - Displays card movements and comments
  - Shows timestamp and user who performed the action
  - Auto-refreshes; can refresh manually with 🔄 button

## 🔌 API Endpoints Used

### Authentication
- `POST /users/login` - Get JWT token

### Boards
- `GET /boards` - Get all user's boards
- `GET /boards/:id` - Get board with full hierarchy
- `GET /boards/:id/activity` - Get board activity feed (authenticated)
- `GET /boards/:id/activity/preview` - Get recent activity (no auth)

### Cards
- `PATCH /cards/:id/move` - Move card to different list
- `POST /cards/:id/comments` - Add comment to card

## 💡 Usage Examples

### Moving a Card
1. Click the "→" button on a card, or
2. Drag the card to another list

### Adding a Comment
1. Click the "┃" button on a card
2. Type your comment
3. Click "Add Comment"

### Viewing Activity
- The activity feed on the right automatically updates
- Shows both card movements and comment additions
- Newest activities appear at the top

## 🔧 Development

The app is built with:
- **Vanilla JavaScript** - No frameworks, lightweight
- **CSS3** - Modern flexbox and grid layouts
- **Fetch API** - For API communication
- **JWT** - For authentication

No build step required for frontend changes - just edit and reload!

## 📝 Notes

- The UI stores the JWT token in memory (not persisted)
- Cards are positioned at the top of target lists when moved
- All timestamps use local browser time
- The activity feed auto-fetches on board changes

## 🚦 Testing the Full Flow

1. **Login** → Enter test credentials
2. **View Board** → Board loads with lists and cards
3. **Move Card** → Drag card to see activity logged
4. **Add Comment** → Click card comment button
5. **Watch Activity Feed** → See real-time updates
6. **Refresh Activity** → Click refresh button to reload

Enjoy! 🎉
