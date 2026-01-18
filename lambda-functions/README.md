# Lambda Functions

This folder contains all AWS Lambda functions for the GameLeaderboard project.

## Functions Overview

### 1. SubmitScore.mjs
**Purpose**: Handles score submissions from players

**Features**:
- Validates score range (0-999,999)
- Checks for existing scores
- Only updates if new score is higher
- Anti-cheat validation
- Returns detailed response with improvement metrics

**Triggered by**: API Gateway POST /submit-score

**Environment**: Node.js 20.x

---

### 2. GetRankings.mjs
**Purpose**: Retrieves leaderboard rankings for a specific game

**Features**:
- Queries DynamoDB GSI for fast sorted results
- Returns top 100 players (configurable)
- Formats rankings with rank numbers
- Supports multiple games

**Triggered by**: API Gateway GET /rankings/{gameId}

**Performance**: ~10ms query time using GSI

---

### 3. GetPlayerStats.mjs
**Purpose**: Aggregates statistics for individual players

**Features**:
- Calculates total games, average score, best score
- Returns complete game history
- Sorts by most recent first

**Triggered by**: API Gateway GET /player/{playerId}

**Returns**:
- Total Games
- Average Score
- Best Score
- Worst Score
- Total Score
- Game History

---

### 4. CalculateRankings.mjs
**Purpose**: Batch processes global rankings

**Features**:
- Scans entire GameScores table
- Groups by game
- Calculates statistics per game
- Logs results to CloudWatch
- Optional SNS notifications

**Triggered by**: EventBridge (every 5 minutes)

**Timeout**: 1 minute (configurable)

---

## Deployment Instructions

### AWS Console Method

1. Go to AWS Lambda → Create function
2. Function name: (see function names above)
3. Runtime: **Node.js 20.x**
4. Architecture: **x86_64**
5. Execution role: **GameLeaderboard-Lambda-Role**
6. Copy code from respective `.mjs` file
7. Click **Deploy**

### AWS CLI Method
```bash
# Create function
aws lambda create-function \
  --function-name SubmitScore \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/GameLeaderboard-Lambda-Role \
  --handler index.handler \
  --zip-file fileb://SubmitScore.zip

# Update function code
aws lambda update-function-code \
  --function-name SubmitScore \
  --zip-file fileb://SubmitScore.zip
```

---

## Testing

### Test SubmitScore

**Event JSON**:
```json
{
  "body": "{\"playerId\":\"test001\",\"playerName\":\"TestPlayer\",\"gameId\":\"game001\",\"score\":15000}"
}
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"message\":\"New score recorded!\",\"score\":15000,...}"
}
```

### Test GetRankings

**Event JSON**:
```json
{
  "pathParameters": {
    "gameId": "game001"
  }
}
```

### Test GetPlayerStats

**Event JSON**:
```json
{
  "pathParameters": {
    "playerId": "test001"
  }
}
```

### Test CalculateRankings

**Event JSON**: `{}` (empty)

---

## IAM Permissions Required

The Lambda execution role needs:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/GameScores",
        "arn:aws:dynamodb:*:*:table/GameScores/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:*:*:GameLeaderboard-Notifications"
    }
  ]
}
```

---

## Monitoring

### CloudWatch Logs

Each function logs to: `/aws/lambda/FUNCTION_NAME`

**View logs**:
1. Lambda Console → Function → Monitor tab
2. Click "View logs in CloudWatch"
3. Select log stream

### CloudWatch Metrics

Monitor:
- **Invocations**: Total function calls
- **Errors**: Failed executions
- **Duration**: Execution time
- **Throttles**: Rate-limited requests

---

## Troubleshooting

### Common Issues

**Error: "Cannot read property 'body' of undefined"**
- Solution: Check API Gateway has Lambda Proxy Integration enabled

**Error: "User is not authorized to perform: dynamodb:Query"**
- Solution: Verify IAM role has DynamoDB permissions

**Error: "Timeout after 3 seconds"**
- Solution: Increase timeout in Configuration → General configuration

**Rankings return empty**
- Solution: Verify GSI `GameRankings-index` exists in DynamoDB

---

## Performance Optimization

### Current Performance
- SubmitScore: ~150ms average
- GetRankings: ~50ms (with GSI)
- GetPlayerStats: ~100ms
- CalculateRankings: ~5s (depends on data volume)

### Optimization Tips
1. Use DynamoDB GSI for sorted queries (already implemented)
2. Enable caching in API Gateway (5 minutes for rankings)
3. Increase Lambda memory for faster cold starts
4. Use Lambda provisioned concurrency for critical functions

---

## Cost Estimates

**Assumptions**: 100K requests/month

| Function | Invocations | Duration | Memory | Cost/Month |
|----------|-------------|----------|--------|------------|
| SubmitScore | 50K | 150ms | 128MB | $0.01 |
| GetRankings | 40K | 50ms | 128MB | $0.004 |
| GetPlayerStats | 10K | 100ms | 128MB | $0.002 |
| CalculateRankings | 8,640 | 5s | 128MB | $0.10 |
| **TOTAL** | | | | **$0.12/month** |

Free tier: 1M requests + 400,000 GB-seconds = **$0 for this project**

---

## Version History

- **v1.0.0** (2026-01-17): Initial release
  - All 4 functions implemented
  - Anti-cheat validation
  - GSI optimized queries
  - Full CORS support

---

## Contributing

When modifying functions:
1. Test locally with sample events
2. Update this README with changes
3. Update main project README if API changes
4. Deploy to AWS and test end-to-end

---

## License

MIT License - See main repository LICENSE file
