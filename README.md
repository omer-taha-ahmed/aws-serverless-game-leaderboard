# 🎮 AWS Serverless Game Leaderboard

> Production-grade serverless gaming statistics platform built with AWS Lambda, DynamoDB, API Gateway, and CloudFront. Features real-time score submission, live rankings, player statistics, and automated ranking calculations.

[![AWS](https://img.shields.io/badge/AWS-100%25%20Serverless-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Lambda](https://img.shields.io/badge/Lambda-4%20Functions-FF9900?style=for-the-badge&logo=aws-lambda&logoColor=white)](https://aws.amazon.com/lambda/)
[![DynamoDB](https://img.shields.io/badge/DynamoDB-NoSQL-4053D6?style=for-the-badge&logo=amazon-dynamodb&logoColor=white)](https://aws.amazon.com/dynamodb/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

![GameLeaderboard Architecture](https://via.placeholder.com/1200x400/667eea/ffffff?text=GameLeaderboard+Architecture+Diagram)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Cost Breakdown](#-cost-breakdown)
- [Prerequisites](#-prerequisites)
- [Installation Guide](#-installation-guide)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Monitoring](#-monitoring)
- [Cleanup](#-cleanup)
- [Lessons Learned](#-lessons-learned)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**GameLeaderboard** is a fully serverless, production-ready gaming statistics platform that demonstrates modern cloud architecture principles. It handles score submissions, calculates rankings in real-time, and provides player statistics—all while scaling automatically from zero to millions of users.

### Why This Project?

Traditional gaming leaderboard systems face several challenges:
- **Scaling Issues**: Servers crash during peak traffic (game launches, tournaments)
- **High Costs**: Always-on servers waste money during low-traffic periods
- **Complex Infrastructure**: Requires load balancers, auto-scaling, database management
- **Maintenance Overhead**: Server patching, security updates, monitoring

**GameLeaderboard solves these with serverless architecture:**
- ✅ **Auto-scales infinitely** - Handles 10 or 10 million players seamlessly
- ✅ **Pay-per-use pricing** - Only pay when players are active ($0 when idle)
- ✅ **Zero server management** - No patching, no maintenance
- ✅ **Global performance** - CDN ensures fast load times worldwide
- ✅ **Built-in resilience** - AWS handles redundancy and failover

### Real-World Use Case

**Scenario: Mobile Game Launch**

- **Day 1**: 100 players → Lambda processes 1,000 requests → Cost: **$0.0003**
- **Day 30**: Game goes viral → 1 million players → Lambda auto-scales → **No crashes!**
- **Traditional servers**: Would cost $1,000s/month and require manual scaling

---

## ✨ Features

### Core Functionality

- **🎯 Real-Time Score Submission** - Players submit scores instantly via REST API
- **🏆 Live Leaderboards** - View top 100 players with auto-refresh every 30 seconds
- **📊 Player Statistics** - Detailed stats: total games, average score, best score, performance trends
- **🔄 Automated Ranking Calculations** - EventBridge triggers ranking updates every 5 minutes
- **🔔 Notifications** - SNS sends email alerts for achievements and rank changes
- **🛡️ Anti-Cheat Validation** - Score range validation and duplicate submission prevention
- **🌍 Global Distribution** - CloudFront CDN for sub-20ms load times worldwide

### Technical Highlights

- **Serverless Architecture** - 100% serverless, no EC2 instances
- **NoSQL Database** - DynamoDB with Global Secondary Index for fast queries (<10ms)
- **RESTful API** - API Gateway with Lambda proxy integration
- **Event-Driven** - Scheduled tasks and event-based triggers
- **Secure** - IAM roles, CORS configuration, input validation
- **Monitored** - CloudWatch logs and metrics for all components

---

## 🏗️ Architecture

### High-Level Architecture Diagram
```
┌─────────────────────┐
│   Player Client     │
│  (Web Browser)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  CloudFront CDN     │
│  (Global Cache)     │
└────┬──────────┬─────┘
     │          │
     ▼          ▼
┌─────────┐ ┌──────────────┐
│   S3    │ │ API Gateway  │
│Frontend │ │   REST API   │
└─────────┘ └──────┬───────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │Lambda 1│ │Lambda 2│ │Lambda 3│
    │Submit  │ │Rankings│ │Stats   │
    └───┬────┘ └───┬────┘ └───┬────┘
        └──────────┼──────────┘
                   ▼
            ┌─────────────┐
            │  DynamoDB   │
            │ (GameScores)│
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐
            │ EventBridge │
            │ (Scheduler) │
            └──────┬──────┘
                   ▼
            ┌─────────────┐
            │  Lambda 4   │
            │  Calculate  │
            └──────┬──────┘
                   ▼
            ┌─────────────┐
            │     SNS     │
            │(Notifications)│
            └─────────────┘
```

### Data Flow

**1. Score Submission Flow**
```
Player → CloudFront → API Gateway → Lambda (SubmitScore) → DynamoDB
                                                           ↓
                                              Validate & Save Score
                                                           ↓
                                              Return Success/Failure
```

**2. Leaderboard Retrieval Flow**
```
Player → CloudFront → API Gateway → Lambda (GetRankings) → DynamoDB GSI Query
                                                                    ↓
                                                          Get Top 100 (<10ms)
                                                                    ↓
                                                          Return Sorted Rankings
```

**3. Automated Ranking Calculation**
```
EventBridge (Every 5 min) → Lambda (CalculateRankings) → DynamoDB Scan
                                                                ↓
                                                    Calculate Global Stats
                                                                ↓
                                                    SNS → Email Notifications
```

### DynamoDB Schema

**Table: GameScores**

| Attribute | Type | Description |
|-----------|------|-------------|
| **PlayerId** (PK) | String | Unique player identifier |
| **GameId** (SK) | String | Game identifier (e.g., game001) |
| Score | Number | Player's score (0-999,999) |
| PlayerName | String | Display name |
| Timestamp | Number | Unix timestamp |
| SubmittedAt | String | ISO 8601 datetime |

**Global Secondary Index: GameRankings-index**

| Attribute | Type | Role |
|-----------|------|------|
| **GameId** (PK) | String | Partition key |
| **Score** (SK) | Number | Sort key (descending) |

**Query Pattern**: "Get top 100 players for game001"
```javascript
Query(IndexName: "GameRankings-index",
      KeyCondition: GameId = "game001",
      ScanIndexForward: false,
      Limit: 100)
// Returns: Top 100 players in 8-12ms
```

---

## 🛠️ Tech Stack

### AWS Services

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Lambda** | Serverless compute for backend logic | 1M requests/month |
| **DynamoDB** | NoSQL database for scores | 25GB storage, 25 RCU/WCU |
| **API Gateway** | REST API endpoints | 1M requests/month |
| **S3** | Static website hosting | 5GB storage |
| **CloudFront** | Global CDN | 1TB data transfer |
| **SNS** | Push notifications | 1M publishes/month |
| **EventBridge** | Scheduled tasks | 14M events/month |
| **IAM** | Access management | Always free |
| **CloudWatch** | Logging & monitoring | 5GB logs, 10 metrics |

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Responsive design with Flexbox/Grid
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Fetch API** - REST API calls

### Backend

- **Node.js 20.x** - Lambda runtime
- **AWS SDK v3** - DynamoDB client, SNS client
- **ES6 Modules** - Modern JavaScript syntax

---

## 💰 Cost Breakdown

### Free Tier (First 12 Months)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda (4 functions) | 1M requests/month | **$0.00** |
| DynamoDB | 25 RCU/WCU, 25GB | **$0.00** |
| API Gateway | 1M requests/month | **$0.00** |
| S3 | 5GB storage | **$0.00** |
| CloudFront | 1TB transfer | **$0.00** |
| SNS | 1M emails/month | **$0.00** |
| EventBridge | 8,640 invocations/month | **$0.00** |
| **TOTAL** | | **$0.00/month** |

### After Free Tier (Low Traffic)

Assuming 100K requests/month:

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 100K requests @ 200ms | $0.02 |
| DynamoDB | 100K reads/writes | $0.13 |
| API Gateway | 100K requests | $0.00 (within free tier) |
| S3 | 1GB storage | $0.023 |
| CloudFront | 10GB transfer | $0.85 |
| SNS | 1K emails | $0.00 |
| **TOTAL** | | **~$1/month** |

### Comparison with Traditional Architecture

| Metric | Serverless (This Project) | Traditional (EC2 + RDS) |
|--------|---------------------------|-------------------------|
| **Monthly Cost (Low Traffic)** | $1 | $40-60 |
| **Monthly Cost (High Traffic)** | Auto-scales, pay-per-use | Fixed cost + over-provisioning |
| **Scaling** | Automatic (0 to millions) | Manual (requires planning) |
| **Maintenance** | Zero | High (patching, monitoring) |
| **Idle Cost** | $0 | $40-60 (always running) |

---

## 📋 Prerequisites

### Required

- **AWS Account** (Free tier eligible)
- **Web Browser** (Chrome, Firefox, Safari, Edge)
- **Text Editor** (VS Code, Notepad++, Sublime)
- **Basic Knowledge**:
  - JavaScript fundamentals
  - REST API concepts
  - AWS Console navigation

### Optional (For Advanced Usage)

- **AWS CLI** - For command-line deployment
- **Git** - For version control
- **Postman** - For API testing

---

## 🚀 Installation Guide

### Quick Start (15 minutes)

Follow the complete step-by-step guide:

👉 **[COMPLETE IMPLEMENTATION GUIDE](./docs/IMPLEMENTATION.md)**

The guide includes:
- ✅ Click-by-click AWS Console instructions
- ✅ Code snippets with explanations
- ✅ Verification steps at each phase
- ✅ Troubleshooting tips
- ✅ Screenshots and examples

### Summary of Steps

1. **Create DynamoDB Table** (5 min)
   - Table: GameScores
   - GSI: GameRankings-index

2. **Create IAM Role** (5 min)
   - Permissions for Lambda to access DynamoDB, CloudWatch, SNS

3. **Create Lambda Functions** (20 min)
   - SubmitScore
   - GetRankings
   - GetPlayerStats
   - CalculateRankings

4. **Create API Gateway** (15 min)
   - POST /submit-score
   - GET /rankings/{gameId}
   - GET /player/{playerId}

5. **Deploy Frontend** (10 min)
   - Upload to S3
   - Configure static website hosting

6. **Create CloudFront Distribution** (10 min)
   - Global CDN setup
   - HTTPS configuration

7. **Configure SNS** (5 min)
   - Create topic
   - Email subscription

8. **Create EventBridge Rule** (5 min)
   - Schedule: Every 5 minutes
   - Target: CalculateRankings Lambda

**Total Time**: ~75 minutes

---

## 🎮 Usage

### Access the Application

**Production URL**: `https://YOUR-CLOUDFRONT-DOMAIN.cloudfront.net`

Replace with your actual CloudFront distribution domain.

### Submit a Score

1. Open the application
2. Fill in the "Submit Score" form:
   - **Player ID**: Unique identifier (e.g., `player123`)
   - **Player Name**: Display name (e.g., `ProGamer99`)
   - **Game**: Select from dropdown (Space Shooter, Puzzle Master, Racing Championship)
   - **Score**: Enter score (0-999,999)
3. Click **Submit Score**

**Expected Response**:
```json
{
  "success": true,
  "message": "New personal best!",
  "score": 15000,
  "previousScore": 12000,
  "improvement": 3000,
  "isNewRecord": false
}
```

### View Leaderboard

1. Select game from dropdown
2. Click **Refresh Rankings**
3. Top 100 players displayed with:
   - Rank (🥇🥈🥉 for top 3)
   - Player Name
   - Score

**Auto-refresh**: Leaderboard updates every 30 seconds automatically

### Check Player Stats

1. Enter Player ID in "Player Statistics" section
2. Click **Get Player Stats**
3. View:
   - Total Games Played
   - Average Score
   - Best Score
   - Total Points
   - Game History

---

## 📡 API Documentation

### Base URL
```
https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod
```

### Endpoints

#### 1. Submit Score

**Endpoint**: `POST /submit-score`

**Request Body**:
```json
{
  "playerId": "player123",
  "playerName": "ProGamer99",
  "gameId": "game001",
  "score": 15000
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "New personal best!",
  "score": 15000,
  "previousScore": 12000,
  "improvement": 3000,
  "isNewRecord": false,
  "timestamp": 1705507200000
}
```

**Error Response** (400):
```json
{
  "success": false,
  "message": "Invalid score range. Score must be between 0 and 999,999"
}
```

---

#### 2. Get Rankings

**Endpoint**: `GET /rankings/{gameId}`

**Parameters**:
- `gameId` (path): Game identifier (e.g., `game001`)
- `limit` (query, optional): Number of results (default: 100)

**Example**:
```
GET /rankings/game001?limit=10
```

**Success Response** (200):
```json
{
  "success": true,
  "gameId": "game001",
  "totalPlayers": 47,
  "rankings": [
    {
      "rank": 1,
      "playerId": "player456",
      "playerName": "ProGamer99",
      "score": 25000,
      "timestamp": 1705507200000,
      "submittedAt": "2026-01-17T14:30:00.000Z"
    },
    {
      "rank": 2,
      "playerId": "player123",
      "playerName": "SpeedRunner",
      "score": 22000,
      "timestamp": 1705506800000,
      "submittedAt": "2026-01-17T14:20:00.000Z"
    }
  ],
  "generatedAt": "2026-01-17T14:35:00.000Z"
}
```

---

#### 3. Get Player Statistics

**Endpoint**: `GET /player/{playerId}`

**Parameters**:
- `playerId` (path): Player identifier

**Example**:
```
GET /player/player123
```

**Success Response** (200):
```json
{
  "success": true,
  "player": {
    "playerId": "player123",
    "playerName": "SpeedRunner",
    "stats": {
      "totalGames": 12,
      "averageScore": 18500,
      "bestScore": 25000,
      "worstScore": 8000,
      "totalScore": 222000
    },
    "gameHistory": [
      {
        "gameId": "game001",
        "score": 25000,
        "timestamp": 1705507200000,
        "submittedAt": "2026-01-17T14:30:00.000Z"
      }
    ]
  },
  "generatedAt": "2026-01-17T14:35:00.000Z"
}
```

**Error Response** (404):
```json
{
  "success": false,
  "message": "Player not found"
}
```

---

### Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request processed successfully |
| 400 | Bad Request | Missing parameters, invalid score range |
| 404 | Not Found | Player doesn't exist |
| 500 | Internal Server Error | Lambda error, DynamoDB issue |

---

## 🧪 Testing

### Manual Testing

**Test Suite**:

1. ✅ **Submit Score** - Valid submission
2. ✅ **Update Score** - Higher score for same player
3. ✅ **Invalid Score** - Out of range (negative, >999,999)
4. ✅ **Missing Fields** - Incomplete request body
5. ✅ **Get Rankings** - Multiple games
6. ✅ **Player Stats** - Existing and non-existing players
7. ✅ **Auto-Ranking** - Wait 5 minutes, check CloudWatch logs

### Using cURL

**Submit Score**:
```bash
curl -X POST https://YOUR-API-URL/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test001",
    "playerName": "TestPlayer",
    "gameId": "game001",
    "score": 10000
  }'
```

**Get Rankings**:
```bash
curl https://YOUR-API-URL/rankings/game001
```

**Get Player Stats**:
```bash
curl https://YOUR-API-URL/player/test001
```

### Using Postman

1. Import collection (create one with all endpoints)
2. Set environment variable: `API_URL`
3. Run collection tests

---

## 📊 Monitoring

### CloudWatch Dashboards

**Key Metrics to Monitor**:

**Lambda Functions**:
- Invocations
- Errors
- Duration
- Throttles
- Concurrent Executions

**DynamoDB**:
- Read/Write Capacity Units consumed
- Throttled requests
- Latency
- Item count

**API Gateway**:
- Request count
- 4XX errors
- 5XX errors
- Latency

### CloudWatch Logs

**View Lambda Logs**:
1. Lambda → Functions → Select function
2. Monitor tab → View logs in CloudWatch
3. Click latest log stream

**Example Log**:
```
START RequestId: abc-123-def
Event received: {"body": "{\"playerId\":\"player123\"..."}
Successfully saved score: 15000
END RequestId: abc-123-def
REPORT Duration: 145.23 ms  Billed Duration: 146 ms  Memory Size: 128 MB  Max Memory Used: 65 MB
```

### Setting Up Alarms

**Example: High Error Rate Alarm**

1. CloudWatch → Alarms → Create Alarm
2. Select metric: Lambda > Errors
3. Conditions: Errors > 10 for 2 consecutive periods
4. Notification: Create SNS topic → Email
5. Create alarm

---

## 🧹 Cleanup

### Delete All Resources (Cost: $0)

**⚠️ WARNING**: This deletes everything permanently!

**Deletion Order** (Important!):

1. **CloudFront Distribution** (5-10 min)
   - Disable → Wait → Delete

2. **S3 Bucket**
   - Empty bucket → Delete bucket

3. **API Gateway**
   - Delete API

4. **Lambda Functions** (all 4)
   - Delete each function

5. **EventBridge Rule**
   - Delete rule

6. **SNS Topic**
   - Delete subscriptions → Delete topic

7. **DynamoDB Table**
   - Delete table (uncheck backup option)

8. **IAM Role**
   - Delete role

**Verification**: All services show 0 resources

**Estimated Time**: 15-20 minutes

---

## 💡 Lessons Learned

### What Went Well

✅ **Serverless Scales Effortlessly**
- No manual intervention needed for traffic spikes
- Lambda handled concurrent requests without configuration

✅ **DynamoDB Performance**
- Consistent <10ms latency even with thousands of records
- GSI made ranking queries extremely fast

✅ **Cost Efficiency**
- Entire project ran for $0 during development
- Production costs ~$1-2/month for moderate traffic

✅ **Developer Experience**
- AWS Console made deployment straightforward
- CloudWatch logs simplified debugging

### Challenges & Solutions

❌ **Challenge**: CORS errors between frontend and API
✅ **Solution**: Enabled CORS in API Gateway AND added headers in Lambda responses

❌ **Challenge**: DynamoDB query returning unsorted results
✅ **Solution**: Used `ScanIndexForward: false` to get descending order

❌ **Challenge**: EventBridge not triggering Lambda
✅ **Solution**: Added resource-based policy to Lambda for EventBridge invocation

❌ **Challenge**: CloudFront taking 15 minutes to deploy
✅ **Solution**: Expected behavior - global distribution takes time

### Best Practices Discovered

1. **Always use Lambda Proxy Integration** - Simplifies request/response handling
2. **Enable CloudWatch Logs from day 1** - Essential for debugging
3. **Test API endpoints individually** - Before integrating with frontend
4. **Use DynamoDB on-demand pricing** - Better for unpredictable workloads
5. **Set Lambda timeout appropriately** - 3 seconds default is often too short

---

## 🔮 Future Enhancements

### Phase 1: Enhanced Features

- [ ] **User Authentication** - Cognito integration for secure logins
- [ ] **Team Leaderboards** - Group players into teams, track team rankings
- [ ] **Achievement System** - Unlock badges for milestones (first score, top 10, etc.)
- [ ] **Real-Time Updates** - WebSocket API for live score broadcasting
- [ ] **Historical Data** - Track score trends over time with charts
- [ ] **Multi-Region Support** - DynamoDB Global Tables for worldwide deployment

### Phase 2: Advanced Analytics

- [ ] **Player Insights Dashboard** - Win rate, performance trends, playtime analysis
- [ ] **Cheat Detection** - ML-based anomaly detection for suspicious scores
- [ ] **Performance Metrics** - Average completion time, difficulty ratings
- [ ] **Leaderboard Segments** - Daily, weekly, monthly, all-time rankings

### Phase 3: DevOps & Automation

- [ ] **CI/CD Pipeline** - GitHub Actions for automated deployments
- [ ] **Infrastructure as Code** - AWS CDK or Terraform for reproducible deployments
- [ ] **Automated Testing** - Jest unit tests, integration tests
- [ ] **Blue/Green Deployments** - Zero-downtime updates
- [ ] **Cost Optimization** - Reserved capacity for predictable workloads

### Phase 4: Scale & Performance

- [ ] **Caching Layer** - ElastiCache for frequently accessed rankings
- [ ] **GraphQL API** - AppSync for flexible queries
- [ ] **Data Archival** - Move old scores to S3 Glacier
- [ ] **Search Functionality** - Elasticsearch for player search

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs

1. Check existing issues first
2. Create new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Suggesting Features

1. Open an issue with `[FEATURE]` prefix
2. Describe the feature and use case
3. Explain why it's valuable

### Code Contributions

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Style

- Use ES6+ syntax
- Follow existing code formatting
- Add comments for complex logic
- Update documentation

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TLDR**: You can use, modify, and distribute this project freely. Just include the original license.

---

## 🙏 Acknowledgments

- **AWS Free Tier** - Made learning serverless architecture accessible
- **AWS Documentation** - Comprehensive guides and examples
- **Serverless Community** - Inspiration and best practices

---

## 📞 Contact

**Omar Taha Ahmed**

- GitHub: [@omer-taha-ahmed](https://github.com/omer-taha-ahmed)
- LinkedIn: [ https://www.linkedin.com/in/omar-taha-ah/ ]
---

## 📸 Screenshots

### Landing Page
![Landing Page](./screenshots/landing-page.png)

### Submit Score
![Submit Score](./screenshots/submit-score.png)

### Leaderboard
![Leaderboard](./screenshots/leaderboard.png)

### Player Statistics
![Player Stats](./screenshots/player-stats.png)

### CloudWatch Logs
![CloudWatch](./screenshots/cloudwatch-logs.png)

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

**Built with ❤️ using AWS Serverless Architecture**

</div>
```
