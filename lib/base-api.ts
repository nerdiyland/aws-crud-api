import { RemovalPolicy } from "aws-cdk-lib";
import { AccessLogField, AccessLogFormat, LogGroupLogDestination, MethodLoggingLevel, RestApi } from "aws-cdk-lib/aws-apigateway";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface BaseApiProps {
  ApiName: string;
}

export class BaseApi extends Construct {

  public readonly api: RestApi;

  public readonly apiLogGroup: LogGroup;

  constructor (scope: Construct, id: string, props: BaseApiProps) {
    super(scope, id);

    this.apiLogGroup = new LogGroup(this, 'ApiLogs', {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_WEEK
    });

    // Create API
    this.api = new RestApi(this, 'RestApi', {
      restApiName: props.ApiName,
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowCredentials: true,
        allowHeaders: ['*'],
        allowMethods: ['*'],
      },
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(this.apiLogGroup),
        accessLogFormat: AccessLogFormat.custom(JSON.stringify({
          requestId: AccessLogField.contextRequestId(),
          identityId: AccessLogField.contextIdentityCognitoIdentityId(),
          identityPoolId: AccessLogField.contextIdentityCognitoIdentityPoolId(),
          apiId: AccessLogField.contextApiId(),
          stageName: AccessLogField.contextStage(),
          error: AccessLogField.contextErrorMessage(),
          statusCode: AccessLogField.contextStatus(),
          date: AccessLogField.contextRequestTime(),
          domain: AccessLogField.contextDomainName(),
          path: AccessLogField.contextPath(),
          method: AccessLogField.contextHttpMethod(),
          responseSize: AccessLogField.contextResponseLength(),
        })),
        loggingLevel: MethodLoggingLevel.INFO, // TODO Change for production
      },
    });
  }
}