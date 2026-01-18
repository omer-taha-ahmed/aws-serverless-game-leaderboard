import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    try {
        // Get gameId from path parameters or query string
        let gameId;
        
        if (event.pathParameters && event.pathParameters.gameId) {
            gameId = event.pathParameters.gameId;
        } else if (event.queryStringParameters && event.queryStringParameters.gameId) {
            gameId = event.queryStringParameters.gameId;
        } else {
            gameId = 'game001'; // Default game
        }
        
        // Get limit from query parameters (default 100)
        const limit = event.queryStringParameters?.limit 
            ? parseInt(event.queryStringParameters.limit) 
            : 100;
        
        // Query DynamoDB using Global Secondary Index
        const params = {
            TableName: 'GameScores',
            IndexName: 'GameRankings-index',
            KeyConditionExpression: 'GameId = :gameId',
            ExpressionAttributeValues: {
                ':gameId': gameId
            },
            ScanIndexForward: false, // Sort descending (highest scores first)
            Limit: limit
        };
        
        const result = await ddbDocClient.send(new QueryCommand(params));
        
        // Format rankings with rank numbers
        const rankings = result.Items.map((item, index) => ({
            rank: index + 1,
            playerId: item.PlayerId,
            playerName: item.PlayerName || 'Anonymous',
            score: item.Score,
            timestamp: item.Timestamp,
            submittedAt: item.SubmittedAt
        }));
        
        // Success response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
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
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                message: 'Error fetching rankings',
                error: error.message
            })
        };
    }
};
