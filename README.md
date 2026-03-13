# Ask a Dinosaur! - Interactive Kiosk App

A fullscreen, touch-optimized interactive kiosk web app for children's science centers (ages 6-12). A friendly animated T-Rex named Rex invites kids to ask questions, and responds in character with humor and real paleontology facts. Built with Next.js and powered by the Anthropic Claude API.

## Deploy to Vercel

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) and import the GitHub repository
3. In the Vercel dashboard, go to **Settings > Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your Anthropic API key
4. Click **Deploy**

## Run Locally

```bash
# Install dependencies
npm install

# Create .env.local with your API key
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Kiosk Setup (Touchscreen Smart Board)

### Chrome Kiosk Mode

Launch Chrome in kiosk mode pointing at your Vercel URL:

```bash
# Windows
chrome.exe --kiosk --disable-pinch --overscroll-history-navigation=disabled https://your-app.vercel.app

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --disable-pinch --overscroll-history-navigation=disabled https://your-app.vercel.app

# Linux
google-chrome --kiosk --disable-pinch --overscroll-history-navigation=disabled https://your-app.vercel.app
```

### Recommended Kiosk Software

For a production exhibit, consider dedicated kiosk software for bulletproof lockdown:
- **KioWare** (Windows) - enterprise kiosk lockdown
- **Fully Kiosk Browser** (Android) - great for Android-based smart boards
- Configure the machine to auto-boot Chrome/kiosk browser on startup

## Estimated API Costs

Each child interaction is roughly 3-5 API calls. Using `claude-sonnet-4-20250514` with `max_tokens: 200`:

| Metric | Estimate |
|--------|----------|
| Avg input tokens per request | ~300 |
| Avg output tokens per request | ~80 |
| Cost per request | ~$0.0012 |
| Cost per child session (5 questions) | ~$0.006 |
| Cost per day (100 sessions) | ~$0.60 |
| Cost per month (3,000 sessions) | ~$18 |

These are rough estimates. Actual costs depend on conversation length and question complexity.

## Customization

### Change Rex's Personality

Edit the system prompt in `app/api/chat/route.ts`. The `SYSTEM_PROMPT` constant defines Rex's character, rules, and behavior.

### Change or Add Quick Questions

Edit the `QUICK_QUESTIONS` array in `app/page.tsx`. You can add, remove, or reorder questions. If you add more than 10, also extend the `BUTTON_COLORS` array.

### Adjust Timeouts

In `app/page.tsx`, change:
- `INACTIVITY_TIMEOUT` (default: 90 seconds) - time before reset warning
- `WARNING_TIME` (default: 10 seconds) - countdown duration before reset

## Tech Stack

- **Next.js 15** (App Router) - React framework optimized for Vercel
- **Tailwind CSS 4** - utility-first CSS
- **Anthropic Claude API** (`claude-sonnet-4-20250514`) - AI responses
- **@anthropic-ai/sdk** - official Anthropic SDK
- No database, no auth, no external dependencies
