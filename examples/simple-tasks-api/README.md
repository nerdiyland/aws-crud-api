# Simple Tasks API Example

This example demonstrates how to create a basic CRUD API for managing tasks using the AWS CRUD API construct.

## What This Example Creates

- A REST API with endpoints for task management
- DynamoDB table for storing tasks
- Lambda function for CRUD operations
- Automatic owner-based access control

## API Endpoints

- `POST /tasks` - Create a new task
- `GET /tasks` - List user's tasks
- `GET /tasks/{id}` - Get a specific task
- `PUT /tasks/{id}` - Update a task
- `DELETE /tasks/{id}` - Delete a task

## Setup

1. Make sure you have AWS CDK installed:
```bash
npm install -g aws-cdk
```

2. Clone this example:
```bash
mkdir my-tasks-api
cd my-tasks-api
```

3. Copy the files from this example directory and install dependencies:
```bash
npm install
```

4. Configure your AWS credentials:
```bash
aws configure
```

5. Bootstrap CDK (if you haven't already):
```bash
cdk bootstrap
```

6. Deploy the stack:
```bash
cdk deploy
```

## Testing the API

After deployment, you'll get an API endpoint URL. You can test it using curl or any HTTP client:

### Create a task:
```bash
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/prod/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title": "Learn AWS CDK", "description": "Study CDK constructs and patterns"}'
```

### List tasks:
```bash
curl https://your-api-id.execute-api.region.amazonaws.com/prod/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get a specific task:
```bash
curl https://your-api-id.execute-api.region.amazonaws.com/prod/tasks/task-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update a task:
```bash
curl -X PUT https://your-api-id.execute-api.region.amazonaws.com/prod/tasks/task-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title": "Learn AWS CDK", "description": "Study CDK constructs and patterns", "completed": true}'
```

### Delete a task:
```bash
curl -X DELETE https://your-api-id.execute-api.region.amazonaws.com/prod/tasks/task-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Cleanup

To remove all resources:
```bash
cdk destroy
```

## Next Steps

- Add authentication with Amazon Cognito
- Enable CORS for browser access
- Add input validation
- Configure custom domain
