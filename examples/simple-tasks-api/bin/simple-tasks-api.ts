#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { SimpleTasksApiStack } from '../lib/simple-tasks-api-stack';

const app = new App();

new SimpleTasksApiStack(app, 'SimpleTasksApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
