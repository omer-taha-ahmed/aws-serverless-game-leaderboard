import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    try {
        // Parse request body
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        
        const { playerId, gameId, score, playerName } = body;
        
        // Validation
        if (!playerId || !gameId || score === undefined || !playerName) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Missing required fields: playerId, gameId, score, playerName'
                })
            };
        }
        
        // Anti-cheat: Basic score validation
        if (score < 0 || score > 999999) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid score range. Score must be between 0 and 999,999'
                })
            };
        }
        
        // Check if player has existing score
        const getParams = {
            TableName: 'GameScores',
            Key: {
                PlayerId: playerId,
                GameId: gameId
            }
        };
        
        const existingScore = await ddbDocClient.send(new GetCommand(getParams));
        
        let isNewRecord = false;
        let previousScore = 0;
        
        if (existingScore.Item) {
            previousScore = existingScore.Item.Score || 0;
            // Only update if new score is better
            if (score <= previousScore) {
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
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
        
        // Save score to DynamoDB
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
        
        // Success response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
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
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};
