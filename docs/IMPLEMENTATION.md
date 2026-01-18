# 📘 Complete Implementation Guide

> Step-by-step guide to deploy GameLeaderboard on AWS. Estimated time: 75 minutes. Cost: $0 (free tier).

---

## 📋 Table of Contents

1. [Preparation](#preparation)
2. [Phase 1: DynamoDB](#phase-1-dynamodb)
3. [Phase 2: IAM Role](#phase-2-iam-role)
4. [Phase 3: Lambda Functions](#phase-3-lambda-functions)
5. [Phase 4: API Gateway](#phase-4-api-gateway)
6. [Phase 5: Frontend Deployment](#phase-5-frontend-deployment)
7. [Phase 6: CloudFront](#phase-6-cloudfront)
8. [Phase 7: SNS](#phase-7-sns)
9. [Phase 8: EventBridge](#phase-8-eventbridge)
10. [Phase 9: Testing](#phase-9-testing)

---

## Preparation

### What You'll Need

- AWS Account (free tier eligible)
- Web browser
- Text editor
- 75 minutes of focused time

### Save These Values

Create a notepad file to save:
- DynamoDB Table ARN
- IAM Role ARN
- Lambda Function ARNs (4 total)
- API Gateway Invoke URL
- S3 Bucket Name
- CloudFront Domain
- SNS Topic ARN

---

## Phase 1: DynamoDB

### Create Table

1. Go to AWS Console → DynamoDB
2. Click **Create table**
3. Settings:
   - Table name: `GameScores`
   - Partition key: `PlayerId` (String)
   - Sort key: `GameId` (String)
   - Table settings: **Customize settings**
   - Capacity mode: **On-demand**
4. Click **Create global index**:
   - Partition key: `GameId` (String)
   - Sort key: `Score` (Number)
   - Index name: `GameRankings-index`
   - Attribute projections: **All**
5. Encryption: **Owned by Amazon DynamoDB**
6. Click **Create table**

**Verification**: Table status shows "Active"

**Save**: Copy Table ARN from table details

---

## Phase 2: IAM Role

### Create Lambda Execution Role

1. Go to IAM → Roles
2. Click **Create role**
3. Trusted entity: **AWS service**
4. Use case: **Lambda**
5. Click **Next**
6. Attach policies:
   - Search and select: `AWSLambdaBasicExecutionRole`
   - Search and select: `AmazonDynamoDBFullAccess`
   - Search and select: `AmazonSNSFullAccess`
7. Click **Next**
8. Role name: `GameLeaderboard-Lambda-Role`
9. Description: `Allows Lambda functions to access DynamoDB, CloudWatch Logs, and SNS`
10. Click **Create role**

**Verification**: Role appears in roles list

**Save**: Copy Role ARN from role summary page

---

## Phase 3: Lambda Functions

Create 4 functions with these common settings for all:

### Common Settings (All Functions)

- Runtime: **Node.js 20.x**
- Architecture: **x86_64**
- Execution role: **Use an existing role** → Select `GameLeaderboard-Lambda-Role`

---

### Function 1: SubmitScore

**Create Function**:
1. Lambda → **Create function**
2. Function name: `SubmitScore`
3. Apply common settings above
4. Click **Create function**

**Add Code**:
Delete default code and paste:
```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { playerId, gameId, score, playerName } = body;
        
        if (!playerId || !gameId || score === undefined || !playerName) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    message: 'Missing required fields: playerId, gameId, score, playerName'
                })
            };
        }
        
        if (score < 0 || score > 999999) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid score range. Score must be between 0 and 999,999'
                })
            };
        }
        
        const getParams = {
            TableName: 'GameScores',
            Key: { PlayerId: playerId, GameId: gameId }
        };
        
        const existingScore = await ddbDocClient.send(new GetCommand(getParams));
        let isNewRecord = false;
        let previousScore = 0;
        
        if (existingScore.Item) {
            previousScore = existingScore.Item.Score || 0;
            if (score <= previousScore) {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({
                        success: true,
                        message: 'Score not updated. Previous score was higher.',
                        currentScore: previousScore,
                        submittedScore: score,
                        isNewRecord: false
                    })
                };
            }
        } else {
            isNewRecord = true;
        }
        
        const timestamp = Date.now();
        const putParams = {
            TableName: 'GameScores',
            Item: {
                PlayerId: playerId,
                GameId: gameId,
                Score: score,
                PlayerName: playerName,
                Timestamp: timestamp,
                SubmittedAt: new Date().toISOString()
            }
        };
        
        await ddbDocClient.send(new PutCommand(putParams));
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                message: isNewRecord ? 'New score recorded!' : 'New personal best!',
                score: score,
                previousScore: previousScore,
                improvement: score - previousScore,
                isNewRecord: isNewRecord,
                timestamp: timestamp
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};
```

Click **Deploy**

**Save**: Copy Function ARN

---

### Function 2: GetRankings

**Create Function**:
1. Lambda → **Create function**
2. Function name: `GetRankings`
3. Apply common settings
4. Click **Create function**

**Add Code**:
```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    try {
        let gameId;
        
        if (event.pathParameters && event.pathParameters.gameId) {
            gameId = event.pathParameters.gameId;
        } else if (event.queryStringParameters && event.queryStringParameters.gameId) {
            gameId = event.queryStringParameters.gameId;
        } else {
            gameId = 'game001';
        }
        
        const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 100;
        
        const params = {
            TableName: 'GameScores',
            IndexName: 'GameRankings-index',
            KeyConditionExpression: 'GameId = :gameId',
            ExpressionAttributeValues: { ':gameId': gameId },
            ScanIndexForward: false,
            Limit: limit
        };
        
        const result = await ddbDocClient.send(new QueryCommand(params));
        
        const rankings = result.Items.map((item, index) => ({
            rank: index + 1,
            playerId: item.PlayerId,
            playerName: item.PlayerName || 'Anonymous',
            score: item.Score,
            timestamp: item.Timestamp,
            submittedAt: item.SubmittedAt
        }));
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                gameId: gameId,
                totalPlayers: rankings.length,
                rankings: rankings,
                generatedAt: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                message: 'Error fetching rankings',
                error: error.message
            })
        };
    }
};
```

Click **Deploy**

**Save**: Copy Function ARN

---

### Function 3: GetPlayerStats

**Create Function**:
1. Lambda → **Create function**
2. Function name: `GetPlayerStats`
3. Apply common settings
4. Click **Create function**

**Add Code**:
```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    try {
        let playerId;
        
        if (event.pathParameters && event.pathParameters.playerId) {
            playerId = event.pathParameters.playerId;
        } else if (event.queryStringParameters && event.queryStringParameters.playerId) {
            playerId = event.queryStringParameters.playerId;
        } else {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    message: 'playerId is required'
                })
            };
        }
        
        const params = {
            TableName: 'GameScores',
            KeyConditionExpression: 'PlayerId = :playerId',
            ExpressionAttributeValues: { ':playerId': playerId }
        };
        
        const result = await ddbDocClient.send(new QueryCommand(params));
        
        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    message: 'Player not found'
                })
            };
        }
        
        const games = result.Items;
        const totalGames = games.length;
        const scores = games.map(g => g.Score);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        const averageScore = Math.round(totalScore / totalGames);
        const bestScore = Math.max(...scores);
        const worstScore = Math.min(...scores);
        const playerName = games[0].PlayerName || 'Anonymous';
        
        const gameHistory = games.map(game => ({
            gameId: game.GameId,
            score: game.Score,
            timestamp: game.Timestamp,
            submittedAt: game.SubmittedAt
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                player: {
                    playerId: playerId,
                    playerName: playerName,
                    stats: {
                        totalGames: totalGames,
                        averageScore: averageScore,
                        bestScore: bestScore,
                        worstScore: worstScore,
                        totalScore: totalScore
                    },
                    gameHistory: gameHistory
                },
                generatedAt: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                message: 'Error fetching player stats',
                error: error.message
            })
        };
    }
};
```

Click **Deploy**

**Save**: Copy Function ARN

---

### Function 4: CalculateRankings

**Create Function**:
1. Lambda → **Create function**
2. Function name: `CalculateRankings`
3. Apply common settings
4. Click **Create function**

**Add Code**:
```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({});

export const handler = async (event) => {
    console.log('Starting ranking calculation...');
    
    try {
        const scanParams = { TableName: 'GameScores' };
        const result = await ddbDocClient.send(new ScanCommand(scanParams));
        
        if (!result.Items || result.Items.length === 0) {
            console.log('No scores found in database');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'No scores to process'
                })
            };
        }
        
        console.log(`Processing ${result.Items.length} score records...`);
        
        const gameGroups = {};
        result.Items.forEach(item => {
            if (!gameGroups[item.GameId]) {
                gameGroups[item.GameId] = [];
            }
            gameGroups[item.GameId].push(item);
        });
        
        const gameStats = {};
        for (const [gameId, scores] of Object.entries(gameGroups)) {
            const sorted = scores.sort((a, b) => b.Score - a.Score);
            
            gameStats[gameId] = {
                totalPlayers: sorted.length,
                topScore: sorted[0].Score,
                topPlayer: sorted[0].PlayerName || sorted[0].PlayerId,
                averageScore: Math.round(
                    sorted.reduce((sum, s) => sum + s.Score, 0) / sorted.length
                )
            };
        }
        
        console.log('Game Statistics:', JSON.stringify(gameStats, null, 2));
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Rankings calculated successfully',
                gamesProcessed: Object.keys(gameGroups).length,
                totalScores: result.Items.length,
                gameStats: gameStats,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error calculating rankings:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: 'Error calculating rankings',
                error: error.message
            })
        };
    }
};
```

Click **Deploy**

**Increase Timeout**:
1. Configuration tab → General configuration → **Edit**
2. Timeout: Change to **1 min 0 sec**
3. Click **Save**

**Save**: Copy Function ARN

---

## Phase 4: API Gateway

### Create REST API

1. Go to API Gateway
2. Click **Create API**
3. Find **REST API** (not Private) → Click **Build**
4. Settings:
   - Choose protocol: **REST**
   - Create new API: **New API**
   - API name: `GameLeaderboard-API`
   - Description: `REST API for game leaderboard system`
   - Endpoint Type: **Regional**
5. Click **Create API**

### Enable CORS (Root Level)

1. Click on `/` (root resource)
2. Actions → **Enable CORS**
3. Leave defaults
4. Click **Enable CORS and replace existing CORS headers**
5. Click **Yes, replace existing values**

### Create Resource: /submit-score

1. Select `/` resource
2. Actions → **Create Resource**
3. Settings:
   - Resource Name: `submit-score`
   - Resource Path: `/submit-score` (auto-filled)
   - Enable API Gateway CORS: ✓
4. Click **Create Resource**

### Create POST Method for /submit-score

1. Select `/submit-score` resource
2. Actions → **Create Method**
3. Select **POST** from dropdown → Click checkmark ✓
4. Settings:
   - Integration type: **Lambda Function**
   - Use Lambda Proxy integration: ✓
   - Lambda Region: **us-east-1**
   - Lambda Function: Type `SubmitScore` (autocomplete)
5. Click **Save**
6. Click **OK** on permission popup

**Enable CORS for POST**:
1. With POST selected, Actions → **Enable CORS**
2. Click **Enable CORS and replace existing CORS headers**
3. Click **Yes, replace existing values**

### Create Resource: /rankings

1. Select `/` resource
2. Actions → **Create Resource**
3. Settings:
   - Resource Name: `rankings`
   - Enable CORS: ✓
4. Click **Create Resource**

### Create Resource: /rankings/{gameId}

1. Select `/rankings` resource
2. Actions → **Create Resource**
3. Settings:
   - Resource Name: `{gameId}` (with curly braces!)
   - Resource Path: `/{gameId}`
   - Enable CORS: ✓
4. Click **Create Resource**

### Create GET Method for /rankings/{gameId}

1. Select `/{gameId}` resource
2. Actions → **Create Method** → **GET** → Checkmark
3. Settings:
   - Integration type: **Lambda Function**
   - Use Lambda Proxy integration: ✓
   - Lambda Function: `GetRankings`
4. Click **Save** → **OK**

**Enable CORS**:
1. Actions → Enable CORS → Enable → Yes

### Create Resource: /player

1. Select `/` resource
2. Actions → **Create Resource**
3. Settings:
   - Resource Name: `player`
   - Enable CORS: ✓
4. Click **Create Resource**

### Create Resource: /player/{playerId}

1. Select `/player` resource
2. Actions → **Create Resource**
3. Settings:
   - Resource Name: `{playerId}` (with curly braces!)
   - Enable CORS: ✓
4. Click **Create Resource**

### Create GET Method for /player/{playerId}

1. Select `/{playerId}` resource
2. Actions → **Create Method** → **GET** → Checkmark
3. Settings:
   - Integration type: **Lambda Function**
   - Use Lambda Proxy integration: ✓
   - Lambda Function: `GetPlayerStats`
4. Click **Save** → **OK**

**Enable CORS**:
1. Actions → Enable CORS → Enable → Yes

### Deploy API

1. Click **Actions** → **Deploy API**
2. Settings:
   - Deployment stage: **[New Stage]**
   - Stage name: `prod`
   - Stage description: `Production environment`
   - Deployment description: `Initial deployment`
3. Click **Deploy**

**Save**: Copy the **Invoke URL** from top of page

**Test**: Open browser, go to `YOUR-INVOKE-URL/rankings/game001` - should return JSON

---

## Phase 5: Frontend Deployment

### Download Frontend File

Download `index.html` from the `/frontend` folder in this repository.

### Update API URL

1. Open `index.html` in text editor
2. Find line (around line 387):
```javascript
   const API_BASE_URL = 'YOUR_API_INVOKE_URL';
```
3. Replace with your actual API Gateway Invoke URL:
```javascript
   const API_BASE_URL = 'https://abc123.execute-api.us-east-1.amazonaws.com/prod';
```
4. Save file

### Create S3 Bucket

1. Go to S3 → **Create bucket**
2. Settings:
   - Bucket name: `game-leaderboard-YOUR-UNIQUE-NAME` (globally unique!)
   - Region: **US East (N. Virginia) us-east-1**
   - Block Public Access: **Uncheck all boxes**
   - Acknowledge warning: ✓
   - Encryption: **Enable** (SSE-S3)
3. Click **Create bucket**

**Save**: Bucket name

### Upload Frontend

1. Click on bucket name
2. Click **Upload** → **Add files**
3. Select `index.html`
4. Click **Upload**
5. Click **Close**

### Enable Static Website Hosting

1. Click **Properties** tab
2. Scroll to bottom → **Static website hosting** → **Edit**
3. Settings:
   - Static website hosting: **Enable**
   - Hosting type: **Host a static website**
   - Index document: `index.html`
   - Error document: `index.html`
4. Click **Save changes**

**Save**: Copy the **Bucket website endpoint** URL

### Make Bucket Public

1. Click **Permissions** tab
2. Scroll to **Bucket policy** → **Edit**
3. Paste this policy (replace `YOUR-BUCKET-NAME`):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

4. Click **Save changes**

**Test**: Open S3 website endpoint URL in browser - website should load

---

## Phase 6: CloudFront

### Create Distribution

1. Go to CloudFront → **Create distribution**
2. Origin settings:
   - Origin domain: Select your S3 bucket (ends with `.s3.us-east-1.amazonaws.com`)
   - Origin access: **Public** (default)
3. Default cache behavior:
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP methods: **GET, HEAD**
   - Cache policy: **CachingOptimized**
4. Web Application Firewall:
   - Security protections: **Do not enable** (to avoid costs)
5. Settings:
   - Price class: **Use all edge locations**
   - Default root object: `index.html`
6. Click **Create distribution**

**Wait**: 5-15 minutes for deployment (status changes from "Deploying" to date/time)

**Save**: Copy **Distribution domain name**

**Test**: Visit `https://YOUR-CLOUDFRONT-DOMAIN.cloudfront.net` - website should load via HTTPS

---

## Phase 7: SNS

### Create Topic

1. Go to SNS → Topics → **Create topic**
2. Settings:
   - Type: **Standard**
   - Name: `GameLeaderboard-Notifications`
   - Display name: `GameLB`
3. Click **Create topic**

**Save**: Copy Topic ARN

### Create Email Subscription

1. Click **Create subscription**
2. Settings:
   - Protocol: **Email**
   - Endpoint: `your-email@example.com` (your real email)
3. Click **Create subscription**

### Confirm Subscription

1. Check email inbox
2. Find "AWS Notification - Subscription Confirmation"
3. Click **Confirm subscription** link
4. Browser opens: "Subscription confirmed!"
5. Refresh AWS Console - Status shows **Confirmed**

---

## Phase 8: EventBridge

### Create Scheduled Rule

1. Go to EventBridge → Rules → **Create rule**
2. Settings:
   - Name: `CalculateRankings-Every5Min`
   - Description: `Triggers Lambda to calculate rankings every 5 minutes`
   - Event bus: **default**
   - Rule type: **Schedule**
3. Click **Next**

### Configure Schedule

1. Schedule pattern: **A schedule that runs at a regular rate, such as every 10 minutes**
2. Rate expression:
   - Value: `5`
   - Unit: **Minutes**
3. Click **Next**

### Select Target

1. Target types: **AWS service**
2. Select a target: **Lambda function**
3. Function: **CalculateRankings**
4. Click **Next**

### Review and Create

1. Skip tags → Click **Next**
2. Review settings
3. Click **Create rule**

**Verification**: Rule appears in list with status **Enabled**

**Save**: Copy Rule ARN

---

## Phase 9: Testing

### Test 1: Submit Score via Frontend

1. Open CloudFront URL
2. Fill submit score form:
   - Player ID: `player001`
   - Player Name: `TestGamer`
   - Game: **Space Shooter**
   - Score: `15000`
3. Click **Submit Score**

**Expected**: Green success message, score appears in leaderboard

### Test 2: Higher Score (Same Player)

1. Submit again:
   - Player ID: `player001`
   - Score: `18500`
2. Click **Submit Score**

**Expected**: "New personal best! Improvement: +3500 points"

### Test 3: Different Player

1. Submit:
   - Player ID: `player002`
   - Player Name: `ProGamer99`
   - Score: `20000`
2. Click **Submit Score**

**Expected**: ProGamer99 at rank #1, TestGamer at rank #2

### Test 4: View Leaderboard

1. Change game dropdown to **Puzzle Master**
2. Click **Refresh Rankings**

**Expected**: "No scores yet for this game"

### Test 5: Player Stats

1. Enter Player ID: `player001`
2. Click **Get Player Stats**

**Expected**: Shows stats (Total Games: 1, Best Score: 18500, etc.)

### Test 6: API Direct Test

Open browser, paste: `YOUR-API-URL/rankings/game001`

**Expected**: JSON response with rankings

### Test 7: EventBridge (Wait 5 Minutes)

1. Wait 5 minutes
2. Go to Lambda → CalculateRankings → Monitor → View logs in CloudWatch
3. Click latest log stream

**Expected**: Logs showing "Starting ranking calculation..." and game statistics

### Test 8: DynamoDB Data

1. Go to DynamoDB → Tables → GameScores
2. Click **Explore table items** → **Run**

**Expected**: See all submitted scores with PlayerId, GameId, Score, PlayerName

---

## Troubleshooting

### CORS Errors

**Problem**: Browser shows CORS error

**Solution**:
- Verify CORS enabled in API Gateway for all methods
- Check Lambda returns `Access-Control-Allow-Origin: *` header
- Redeploy API after CORS changes

### API Returns 403 Forbidden

**Problem**: API calls fail with 403

**Solution**:
- Check Lambda has correct IAM role
- Verify API Gateway method has Lambda integration
- Redeploy API

### Lambda Not Triggered

**Problem**: EventBridge doesn't trigger Lambda

**Solution**:
- Check EventBridge rule is **Enabled**
- Verify Lambda has EventBridge permission (resource-based policy)
- Check CloudWatch logs for errors

### DynamoDB Query Returns Empty

**Problem**: Rankings return no results

**Solution**:
- Verify GSI `GameRankings-index` exists
- Check gameId matches exactly (case-sensitive)
- Use DynamoDB console to verify data exists

### CloudFront Shows Old Version

**Problem**: Changes not reflected on CloudFront

**Solution**:
- Create invalidation: `/*`
- Wait 3-5 minutes
- Hard refresh browser (Ctrl+Shift+R)

---

## Next Steps

After successful deployment:

1. ✅ Take screenshots for portfolio
2. ✅ Test all features thoroughly
3. ✅ Monitor CloudWatch logs
4. ✅ Check costs in AWS Billing dashboard
5. ✅ Document any customizations
6. ✅ Share your project!

---

## Support

Issues? Check:
- [Main README](../README.md)
- [AWS Documentation](https://docs.aws.amazon.com/)

---

**🎉 Congratulations! You've deployed a production-grade serverless application on AWS!**
