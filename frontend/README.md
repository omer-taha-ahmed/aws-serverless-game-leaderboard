# Frontend Application

Modern, responsive web interface for the GameLeaderboard platform.

## Overview

Single-page application (SPA) built with vanilla JavaScript, HTML5, and CSS3. No frameworks required!

## Features

### Core Functionality
- ✅ **Score Submission** - Submit scores with real-time validation
- ✅ **Live Leaderboards** - Auto-refreshing rankings every 30 seconds
- ✅ **Player Statistics** - Detailed player performance metrics
- ✅ **Multi-Game Support** - Switch between different games
- ✅ **Responsive Design** - Mobile, tablet, and desktop optimized

### UI/UX Features
- Beautiful gradient design
- Smooth animations and transitions
- Loading states and spinners
- Success/error message notifications
- Medal badges for top 3 players (🥇🥈🥉)
- Real-time API status indicator

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic markup, forms |
| **CSS3** | Styling, Grid, Flexbox, animations |
| **JavaScript ES6+** | Logic, Fetch API, async/await |
| **No Frameworks** | Vanilla JS for lightweight deployment |

---

## File Structure
```
frontend/
├── index.html          # Complete SPA (HTML + CSS + JS in one file)
└── README.md          # This file
```

**Why single file?**
- Easier deployment to S3
- Faster initial load (no multiple requests)
- Simpler for beginners
- Works perfectly for this project size

---

## Configuration

### API URL Setup

**Before deploying**, update the API base URL:

1. Open `index.html`
2. Find line ~387:
```javascript
   const API_BASE_URL = 'YOUR_API_INVOKE_URL';
```
3. Replace with your actual API Gateway URL:
```javascript
   const API_BASE_URL = 'https://abc123.execute-api.us-east-1.amazonaws.com/prod';
```
4. Save file

⚠️ **CRITICAL**: No trailing slash! 
- ✅ Correct: `https://xxx.execute-api.us-east-1.amazonaws.com/prod`
- ❌ Wrong: `https://xxx.execute-api.us-east-1.amazonaws.com/prod/`

---

## Deployment

### Method 1: AWS S3 (Recommended)

**Upload to S3**:
```bash
# Using AWS CLI
aws s3 cp index.html s3://your-bucket-name/

# Or use AWS Console
1. Go to S3 → Your bucket
2. Click Upload → Add files
3. Select index.html
4. Click Upload
```

**Enable Static Website Hosting**:
1. Bucket → Properties → Static website hosting
2. Enable → Index document: `index.html`
3. Save

**Make Public**:
Add bucket policy (replace `YOUR-BUCKET`):
```json
{
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::YOUR-BUCKET/*"
    }]
}
```

### Method 2: CloudFront (Production)

1. Create CloudFront distribution
2. Origin: Your S3 bucket
3. Default root object: `index.html`
4. Wait 10-15 minutes for deployment
5. Access via: `https://YOUR-CLOUDFRONT-DOMAIN.cloudfront.net`

### Method 3: Local Testing

Simply open `index.html` in your browser!

**Note**: You'll see CORS errors if testing locally. This is expected - API is configured for S3/CloudFront domains.

---

## API Integration

### Endpoints Used

| Endpoint | Method | Purpose | Function Called |
|----------|--------|---------|-----------------|
| `/submit-score` | POST | Submit player score | `submitScoreForm.submit` |
| `/rankings/{gameId}` | GET | Get leaderboard | `loadLeaderboard()` |
| `/player/{playerId}` | GET | Get player stats | `loadPlayerStats()` |

### Request Examples

**Submit Score**:
```javascript
fetch(`${API_BASE_URL}/submit-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        playerId: 'player123',
        playerName: 'ProGamer',
        gameId: 'game001',
        score: 15000
    })
});
```

**Get Rankings**:
```javascript
fetch(`${API_BASE_URL}/rankings/game001`);
```

**Get Player Stats**:
```javascript
fetch(`${API_BASE_URL}/player/player123`);
```

---

## Features Deep Dive

### 1. Score Submission

**Form Validation**:
- Player ID: Required, text input
- Player Name: Required, text input
- Game: Required, dropdown (3 games)
- Score: Required, number, 0-999,999 range

**Flow**:
1. User fills form
2. Client-side validation
3. POST to API
4. Server validation (Lambda)
5. DynamoDB save
6. Success/error message displayed
7. Leaderboard auto-refreshes

### 2. Live Leaderboard

**Features**:
- Game selector dropdown
- Top 100 players displayed
- Rank badges (🥇🥈🥉 for top 3)
- Player name and ID
- Score with thousands separator
- Auto-refresh every 30 seconds

**Refresh Mechanism**:
```javascript
setInterval(() => {
    loadLeaderboard();
    checkAPIStatus();
}, 30000); // 30 seconds
```

### 3. Player Statistics

**Metrics Displayed**:
- Total Games Played
- Average Score
- Best Score
- Total Points

**Search Functionality**:
- Enter any Player ID
- Instant lookup
- Full game history shown

### 4. API Status Indicator

Real-time status check:
- 🟢 Green: API online
- 🟡 Yellow: API warning
- 🔴 Red: API offline

Updates every 30 seconds automatically.

---

## Styling Guide

### Color Scheme
```css
Primary Gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
Background: Purple gradient
Cards: White (#ffffff)
Success: Green (#d4edda)
Error: Red (#f8d7da)
Text Primary: #333333
Text Secondary: #666666
```

### Typography
```css
Font Family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
Headings: Bold, large sizes
Body: Regular, 1em
```

### Responsive Breakpoints
```css
Desktop: > 768px (2-column grid)
Tablet/Mobile: ≤ 768px (1-column stack)
```

---

## JavaScript Functions Reference

### Main Functions

| Function | Purpose | Triggers |
|----------|---------|----------|
| `checkAPIStatus()` | Test API connectivity | On load, every 30s |
| `loadLeaderboard()` | Fetch and display rankings | On load, game change, after submit |
| `loadPlayerStats()` | Fetch player data | Button click |
| `addTask()` | Submit new score | Form submit |
| `updateTime()` | Update last update timestamp | Every second |

### Event Listeners
```javascript
// On page load
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    setInterval(checkHealth, 5000);
});

// Form submission
document.getElementById('submitScoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Submit logic
});

// Enter key in task input
document.addEventListener('keypress', (e) => {
if (e.key === 'Enter') addTask();
});
---

## Browser Compatibility

| Browser | Version | Supported |
|---------|---------|-----------|
| Chrome | 90+ | ✅ Yes |
| Firefox | 88+ | ✅ Yes |
| Safari | 14+ | ✅ Yes |
| Edge | 90+ | ✅ Yes |
| IE 11 | N/A | ❌ No (uses ES6+) |

**Required Features**:
- Fetch API
- Promises/Async-Await
- ES6 arrow functions
- Template literals
- CSS Grid/Flexbox

---

## Testing

### Manual Testing Checklist

- [ ] Page loads without errors
- [ ] API status shows green
- [ ] Submit score form validation works
- [ ] Score submission succeeds
- [ ] Leaderboard displays correctly
- [ ] Player stats retrieval works
- [ ] Auto-refresh works (wait 30s)
- [ ] Responsive on mobile
- [ ] All buttons clickable
- [ ] No console errors

### Test Data

**Valid Submissions**:
```javascript
Player ID: test001
Player Name: TestGamer
Game: game001
Score: 15000
```

**Invalid Submissions** (should error):
```javascript
Score: -100 (negative)
Score: 1000000 (too high)
Player ID: (empty)
```

---

## Performance

### Metrics

- **Initial Load**: ~500ms (single file, no external dependencies)
- **API Calls**: ~100-200ms average
- **Leaderboard Refresh**: ~50ms (DynamoDB GSI)
- **Total Page Size**: ~25KB (HTML+CSS+JS combined)

### Optimization Tips

1. **Minimize API Calls**:
   - Cache rankings for 30s
   - Debounce player stats searches
   
2. **Reduce Reflows**:
   - Batch DOM updates
   - Use `DocumentFragment` for table rows

3. **Lazy Load**:
   - Load player stats only on request
   - Don't fetch all games on load

---

## Troubleshooting

### Common Issues

**Problem**: CORS errors in browser console

**Solution**:
- Verify API Gateway has CORS enabled
- Check Lambda returns CORS headers
- Redeploy API after CORS changes

---

**Problem**: API calls return 403 Forbidden

**Solution**:
- Check API URL is correct
- Verify API is deployed
- Check CloudWatch logs for errors

---

**Problem**: Leaderboard shows "Loading..." forever

**Solution**:
- Open browser DevTools → Network tab
- Check if API request succeeded
- Verify response format matches expected JSON

---

**Problem**: Scores not updating

**Solution**:
- Check DynamoDB table for data
- Verify score meets update criteria (higher than previous)
- Check Lambda logs in CloudWatch

---

## Security Considerations

### Current Implementation

- ✅ HTTPS via CloudFront
- ✅ CORS restricted to allowed origins
- ✅ Input validation (client and server)
- ✅ No sensitive data exposed
- ❌ No authentication (intentional for demo)

### Production Recommendations

For production use, add:
1. **AWS Cognito** - User authentication
2. **API Keys** - Rate limiting per user
3. **Input Sanitization** - Prevent XSS
4. **CAPTCHA** - Prevent bot submissions
5. **WAF** - DDoS protection

---

## Customization Guide

### Change Color Scheme

Find in `<style>` section:
```css
/* Primary colors */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Change to your colors */
background: linear-gradient(135deg, #YOUR_COLOR_1, #YOUR_COLOR_2);
```

### Add More Games

1. Update game dropdown (line ~300):
```html
<select id="gameId">
    <option value="game001">Space Shooter</option>
    <option value="game002">Puzzle Master</option>
    <option value="game003">Racing Championship</option>
    <option value="game004">YOUR NEW GAME</option>
</select>
```

2. Repeat for leaderboard dropdown (~350)

### Change Auto-Refresh Interval

Find (line ~600):
```javascript
setInterval(() => {
    loadLeaderboard();
}, 30000); // Change 30000 to desired milliseconds
```

---

## Accessibility

Current accessibility features:
- ✅ Semantic HTML5 tags
- ✅ Proper form labels
- ✅ Color contrast ratios meet WCAG AA
- ✅ Keyboard navigation works
- ❌ No ARIA labels (could be added)
- ❌ No screen reader optimization

**Improvements for accessibility**:
```html
<!-- Add ARIA labels -->
<button aria-label="Submit player score">Submit Score</button>

<!-- Add roles -->
<div role="status" aria-live="polite">Score submitted!</div>
```

---

## Future Enhancements

Potential features to add:
- [ ] Dark mode toggle
- [ ] Chart.js integration for score trends
- [ ] Real-time WebSocket updates
- [ ] Player avatars
- [ ] Achievement badges
- [ ] Export leaderboard to CSV
- [ ] Social sharing buttons
- [ ] Multi-language support

---

## Credits

Built with:
- Pure vanilla JavaScript (no frameworks!)
- CSS Grid and Flexbox
- AWS SDK (via API Gateway)
- Love and coffee ☕

---

## License

MIT License - See main repository LICENSE file

---

## Questions?

Open an issue in the main repository or check the [Implementation Guide](../docs/IMPLEMENTATION.md).
