import { } from 'aws-sdk'
import Log from '@dazn/lambda-powertools-logger';
import { FunctionEvent } from '@devax/models/dist/base/FunctionEvent';
import { CreateEngagementRequest } from '@devax/models/dist/engagements/io/CreateEngagementRequest';
import { EngagementByIdRequest } from '@devax/models/dist/engagements/io/EngagementByIdRequest';
import { EngagementsCrud } from './engagements-crud';
import { UpdateEngagementRequest } from '@devax/models/dist/engagements/io/UpdateEngagementRequest';

export enum OperationType {
  CREATE_ENGAGEMENT = 'createEngagement',
  LIST_ENGAGEMENTS = 'listEngagements',
  GET_ENGAGEMENT = 'getEngagementById',
  UPDATE_ENGAGEMENT = 'updateEngagement',
  DELETE_ENGAGEMENT = 'deleteEngagement'
}

const INVALID_OPERATION_EXCEPTION = new Error('Invalid operation requested');

/* TODO */
export const handler = async (event: FunctionEvent<any>) => {
  const { UserId, TeamId, Data, OperationName } = event;

  // Assign default team
  let finalTeamId = TeamId;
  if (!TeamId) finalTeamId = 'UNKNOWN';

  Log.info('Starting Engagements CRUD request', { UserId, TeamId: finalTeamId, Data, OperationName });
  const engagementsCrud = new EngagementsCrud({
    UserId,
    TeamId: finalTeamId,
    EngagementsTableName: process.env.ENGAGEMENTS_TABLE_NAME!,
  });

  let engagementId: string | null = null;
  switch (OperationName) {
    case OperationType.CREATE_ENGAGEMENT:
      Log.info('Processing engagement creation');
      const createResult = await engagementsCrud.createEngagement(Data as CreateEngagementRequest);
      return createResult;
    case OperationType.LIST_ENGAGEMENTS:
      Log.info('Processing engagement list request');
      const listResult = await engagementsCrud.listEngagements();
      return listResult;
    case OperationType.GET_ENGAGEMENT:
      engagementId = (Data as EngagementByIdRequest).EngagementId;
      Log.info('Reading engagement by id', { engagementId });
      try {
        const getResult = await engagementsCrud.getEngagementById(engagementId);
        return getResult;
      } catch (e) {
        if (e === EngagementsCrud.ENGAGEMENT_NOT_FOUND_EXCEPTION) {
          Log.error('The requested engagement was not found', { engagementId });
          throw 'ENGAGEMENT_NOT_FOUND';
        }
      }
    case OperationType.UPDATE_ENGAGEMENT:
      engagementId = (Data as EngagementByIdRequest).EngagementId;
      Log.info('Updating engagement by id', { engagementId });
      const updateResult = await engagementsCrud.updateEngagement(engagementId, Data.Changes as UpdateEngagementRequest);
      return updateResult;
    case OperationType.DELETE_ENGAGEMENT:
      engagementId = (Data as EngagementByIdRequest).EngagementId;
      Log.info('Deleting engagement by id', { engagementId });
      await engagementsCrud.deleteEngagement(engagementId);
      return;
    default:
      Log.error('Unknown operation requested', { OperationName });
      throw INVALID_OPERATION_EXCEPTION;

  }

};
