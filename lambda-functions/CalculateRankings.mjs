import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({});

export const handler = async (event) => {
    console.log('Starting ranking calculation...');
    
    try {
        // Scan entire table to get all scores
        const scanParams = {
            TableName: 'GameScores'
        };
        
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
        
        // Group scores by game
        const gameGroups = {};
        result.Items.forEach(item => {
            if (!gameGroups[item.GameId]) {
                gameGroups[item.GameId] = [];
            }
            gameGroups[item.GameId].push(item);
        });
        
        // Calculate rankings for each game
        const gameStats = {};
        for (const [gameId, scores] of Object.entries(gameGroups)) {
            // Sort by score descending
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
        
        // Log statistics
        console.log('Game Statistics:', JSON.stringify(gameStats, null, 2));
        
        // Optional: Send SNS notification (if SNS topic exists)
        // Uncomment when SNS is configured
        /*
        try {
            await snsClient.send(new PublishCommand({
                TopicArn: process.env.SNS_TOPIC_ARN,
                Subject: 'GameLeaderboard - Ranking Update',
                Message: `Rankings calculated successfully!\n\n${JSON.stringify(gameStats, null, 2)}`
            }));
            console.log('SNS notification sent');
        } catch (snsError) {
            console.log('SNS notification failed (topic may not exist):', snsError.message);
        }
        */
        
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
