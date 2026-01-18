import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    try {
        // Get playerId from path parameters or query string
        let playerId;
        
        if (event.pathParameters && event.pathParameters.playerId) {
            playerId = event.pathParameters.playerId;
        } else if (event.queryStringParameters && event.queryStringParameters.playerId) {
            playerId = event.queryStringParameters.playerId;
        } else {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'playerId is required'
                })
            };
        }
        
        // Query all games for this player
        const params = {
            TableName: 'GameScores',
            KeyConditionExpression: 'PlayerId = :playerId',
            ExpressionAttributeValues: {
                ':playerId': playerId
            }
        };
        
        const result = await ddbDocClient.send(new QueryCommand(params));
        
        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Player not found'
                })
            };
        }
        
        // Calculate statistics
        const games = result.Items;
        const totalGames = games.length;
        const scores = games.map(g => g.Score);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        const averageScore = Math.round(totalScore / totalGames);
        const bestScore = Math.max(...scores);
        const worstScore = Math.min(...scores);
        
        // Get player name from first record
        const playerName = games[0].PlayerName || 'Anonymous';
        
        // Format game history
        const gameHistory = games.map(game => ({
            gameId: game.GameId,
            score: game.Score,
            timestamp: game.Timestamp,
            submittedAt: game.SubmittedAt
        })).sort((a, b) => b.timestamp - a.timestamp); // Most recent first
        
        // Success response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
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
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                message: 'Error fetching player stats',
                error: error.message
            })
        };
    }
};
