# 🧹 Resource Cleanup Guide

> Complete guide to delete all AWS resources and return to $0 cost

---

## ⚠️ WARNING

**This will permanently delete**:
- All Lambda functions
- DynamoDB table and ALL data
- API Gateway
- S3 bucket and files
- CloudFront distribution
- SNS topics and subscriptions
- EventBridge rules
- IAM role

**Backup first if you want to keep any data!**

---

## 📋 Deletion Order

**IMPORTANT**: Delete in this order to avoid dependency errors!

1. CloudFront Distribution (disable first, wait, then delete)
2. S3 Bucket (empty first, then delete)
3. API Gateway
4. EventBridge Rule
5. Lambda Functions (all 4)
6. SNS Topic
7. DynamoDB Table
8. IAM Role

**Estimated Time**: 20-30 minutes (CloudFront takes longest)

---

## Step-by-Step Instructions

### 1. Delete CloudFront Distribution

**Why first**: Takes 10-15 minutes to disable

**Steps**:
1. Go to CloudFront → Distributions
2. Select your distribution (checkbox)
3. Click **Disable**
4. Wait 10-15 minutes (status changes from "InProgress" to date/time)
5. Refresh page
6. Select distribution again
7. Click **Delete**
8. Confirm deletion

**Verification**: Distributions list shows 0

**⏱️ Time**: 15-20 minutes

---

### 2. Delete S3 Bucket

**Why now**: No longer referenced by CloudFront

**Steps**:

**Empty bucket first**:
1. Go to S3 → Buckets
2. Click on bucket name
3. Click **Empty** button
4. Type: `permanently delete`
5. Click **Empty**
6. Wait for completion message

**Delete bucket**:
1. Go back to Buckets list
2. Select bucket (checkbox)
3. Click **Delete**
4. Type bucket name exactly to confirm
5. Click **Delete bucket**

**Verification**: Bucket no longer in list

**⏱️ Time**: 2 minutes

---

### 3. Delete API Gateway

**Steps**:
1. Go to API Gateway → APIs
2. Select **GameLeaderboard-API** (radio button)
3. Click **Actions** dropdown → **Delete**
4. Type: `confirm`
5. Click **Delete**

**Verification**: APIs list shows 0 or API is gone

**⏱️ Time**: 1 minute

---

### 4. Delete EventBridge Rule

**Steps**:
1. Go to EventBridge → Rules
2. Select **CalculateRankings-Every5Min** (checkbox)
3. Click **Delete**
4. Click **Delete** in confirmation dialog

**Verification**: Rule no longer in list

**⏱️ Time**: 30 seconds

---

### 5. Delete Lambda Functions

**Repeat for all 4 functions**:
- SubmitScore
- GetRankings
- GetPlayerStats
- CalculateRankings

**Steps for each**:
1. Go to Lambda → Functions
2. Select function (checkbox)
3. Click **Actions** → **Delete**
4. Type: `delete`
5. Click **Delete**

**Quick method (delete all at once)**:
1. Select all 4 functions (hold Ctrl/Cmd and click each)
2. Actions → Delete
3. Confirm

**Verification**: Functions list shows 0

**⏱️ Time**: 2 minutes

---

### 6. Delete SNS Topic

**Steps**:
1. Go to SNS → Topics
2. Select **GameLeaderboard-Notifications** (checkbox)
3. Click **Delete**
4. Type: `delete me`
5. Click **Delete**

**Note**: This also deletes all subscriptions automatically

**Verification**: Topics list shows 0 or topic is gone

**⏱️ Time**: 30 seconds

---

### 7. Delete DynamoDB Table

**Steps**:
1. Go to DynamoDB → Tables
2. Click on **GameScores** (blue link, not checkbox)
3. Click **Delete** button (top right, orange/red)
4. Delete protection:
   - **Uncheck** "Create a backup before deleting"
   - **Check** "Delete all CloudWatch alarms for this table"
5. Type: `confirm`
6. Click **Delete table**

**Verification**: 
- Green banner appears
- Table status shows "Deleting"
- After 1 minute, table disappears from list

**⏱️ Time**: 1-2 minutes

---

### 8. Delete IAM Role

**Steps**:
1. Go to IAM → Roles
2. Search: `GameLeaderboard-Lambda-Role`
3. Select role (checkbox)
4. Click **Delete**
5. Type role name: `GameLeaderboard-Lambda-Role`
6. Click **Delete**

**Verification**: Role no longer appears in search

**⏱️ Time**: 1 minute

---

## ✅ Final Verification

Check each service to confirm everything is deleted:

### Checklist

- [ ] **CloudFront**: 0 distributions
- [ ] **S3**: Bucket not in list
- [ ] **API Gateway**: 0 APIs (or GameLeaderboard-API gone)
- [ ] **Lambda**: 0 functions (or our 4 functions gone)
- [ ] **EventBridge**: Rule not in list
- [ ] **SNS**: 0 topics (or our topic gone)
- [ ] **DynamoDB**: 0 tables (or GameScores gone)
- [ ] **IAM**: Role not found

### Quick Verification Links

1. [CloudFront Distributions](https://console.aws.amazon.com/cloudfront/v3/home#/distributions)
2. [S3 Buckets](https://s3.console.aws.amazon.com/s3/buckets)
3. [API Gateway](https://console.aws.amazon.com/apigateway/main/apis)
4. [Lambda Functions](https://console.aws.amazon.com/lambda/home#/functions)
5. [EventBridge Rules](https://console.aws.amazon.com/events/home#/rules)
6. [SNS Topics](https://console.aws.amazon.com/sns/v3/home#/topics)
7. [DynamoDB Tables](https://console.aws.amazon.com/dynamodbv2/home#tables)
8. [IAM Roles](https://console.aws.amazon.com/iam/home#/roles)

---

## 💰 Cost Verification

After cleanup, verify you're not being charged:

1. Go to [AWS Billing Dashboard](https://console.aws.amazon.com/billing/home)
2. Click **Bills** (left sidebar)
3. Check current month charges
4. Should show **$0.00** for:
   - Lambda
   - DynamoDB
   - API Gateway
   - S3
   - CloudFront
   - SNS
   - EventBridge

**Note**: Some services show charges on the 1st of next month. Check again in a few days.

---

## 🔄 If You Want to Redeploy

Good news! You can redeploy anytime using the [Implementation Guide](./IMPLEMENTATION.md).

**All code is saved in this repository**:
- Lambda functions in `/lambda-functions`
- Frontend in `/frontend`
- Documentation in `/docs`

**Time to redeploy**: ~75 minutes (same as original deployment)

---

## ⚠️ Common Issues

### Issue: Can't delete CloudFront distribution

**Error**: "Distribution is enabled. You must disable it before deleting."

**Solution**:
1. Click on distribution ID
2. Click **Disable**
3. Wait 10-15 minutes
4. Try deleting again

---

### Issue: Can't delete S3 bucket

**Error**: "Bucket is not empty"

**Solution**:
1. Go to bucket
2. Click **Empty** (not Delete!)
3. Confirm by typing "permanently delete"
4. Wait for completion
5. Then delete bucket

---

### Issue: Can't delete Lambda function

**Error**: "Function has EventSourceMappings"

**Solution**:
1. Delete EventBridge rule first
2. Wait 1 minute
3. Try deleting Lambda again

---

### Issue: Can't delete IAM role

**Error**: "Role is in use by Lambda function"

**Solution**:
1. Delete all Lambda functions first
2. Wait 2-3 minutes
3. Try deleting role again

---

## 📊 What Gets Deleted

| Resource | Data Lost | Recoverable |
|----------|-----------|-------------|
| DynamoDB Table | All scores, players | ❌ No (unless backed up) |
| Lambda Functions | No data (code in repo) | ✅ Yes (redeploy) |
| API Gateway | Configuration only | ✅ Yes (redeploy) |
| S3 Bucket | Frontend file | ✅ Yes (in repo) |
| CloudFront | Configuration only | ✅ Yes (redeploy) |
| SNS | Topics, subscriptions | ✅ Yes (recreate) |
| EventBridge | Schedule rule | ✅ Yes (recreate) |
| IAM Role | Permissions only | ✅ Yes (recreate) |

**Bottom line**: Only DynamoDB data is lost permanently (unless you export it first)

---

## 💾 Backup Before Deletion (Optional)

### Export DynamoDB Data

**Method 1: AWS Console**
1. DynamoDB → Tables → GameScores
2. Actions → Export to S3
3. Choose destination bucket
4. Wait for export to complete
5. Download from S3

**Method 2: AWS CLI**
```bash
aws dynamodb scan --table-name GameScores > gamescores-backup.json
```

### Save Lambda Code

Already done! All code is in this GitHub repository.

### Save Configuration

Document these values before deletion:
- API Gateway endpoints
- CloudFront domain
- S3 bucket name
- IAM role policies

---

## 🎯 Quick Cleanup (Advanced)

For experienced users who want to delete everything quickly:

**Using AWS CLI**:
```bash
# Delete CloudFront (get distribution ID first)
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID
aws cloudfront update-distribution --id YOUR_DISTRIBUTION_ID --if-match ETAG --distribution-config '{"Enabled":false,...}'
# Wait 15 minutes
aws cloudfront delete-distribution --id YOUR_DISTRIBUTION_ID --if-match ETAG

# Empty and delete S3
aws s3 rm s3://YOUR_BUCKET_NAME --recursive
aws s3 rb s3://YOUR_BUCKET_NAME

# Delete API Gateway
aws apigateway delete-rest-api --rest-api-id YOUR_API_ID

# Delete EventBridge Rule
aws events remove-targets --rule CalculateRankings-Every5Min --ids "1"
aws events delete-rule --name CalculateRankings-Every5Min

# Delete Lambda Functions
aws lambda delete-function --function-name SubmitScore
aws lambda delete-function --function-name GetRankings
aws lambda delete-function --function-name GetPlayerStats
aws lambda delete-function --function-name CalculateRankings

# Delete SNS Topic
aws sns delete-topic --topic-arn YOUR_TOPIC_ARN

# Delete DynamoDB Table
aws dynamodb delete-table --table-name GameScores

# Delete IAM Role (detach policies first)
aws iam detach-role-policy --role-name GameLeaderboard-Lambda-Role --policy-arn arn:aws:iam::aws:policy/AWSLambdaBasicExecutionRole
aws iam detach-role-policy --role-name GameLeaderboard-Lambda-Role --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam detach-role-policy --role-name GameLeaderboard-Lambda-Role --policy-arn arn:aws:iam::aws:policy/AmazonSNSFullAccess
aws iam delete-role --role-name GameLeaderboard-Lambda-Role
```

**⚠️ Warning**: This deletes everything immediately with no confirmation prompts!

---

## 📞 Need Help?

If you encounter issues during cleanup:

1. Check AWS Service Health Dashboard
2. Review deletion order (some resources depend on others)
3. Wait a few minutes and try again (eventual consistency)
4. Open GitHub issue with error message

---

## ✅ Cleanup Complete!

**After successful cleanup**:
- ✅ No AWS resources running
- ✅ No ongoing costs
- ✅ Bill returns to $0/month
- ✅ Can redeploy anytime from this repo

**Portfolio ready**: You have all code, documentation, and (hopefully) screenshots saved!

---

**🎉 Great job completing the project!**
