import Validator, {ValidationError} from 'fastest-validator';
import {AppConfigI, appConfigSchema} from './app-config.js'


export interface ExecutionContextI {
  appContext?: string; // The application context, for example, butchersrow
  thread?: string; // The thread of execution, which can span across processes (if supplied in headers).
  requestId?: string; // The current process request id, as formed from  the aws request id.
  authorization?: string; // Optional authorization in Bearer Token format Bearer [jwt]
  localContext?: string; // Optional local context - user beware of tracking this!
  usePromises?: boolean; // Optional, where promises are an option, use them if true
  config?: AppConfigI;
}


export const executionContextSchema = {
  type: 'object',
  optional: true,
  props: {
    appContext: {
      type: 'string',
      optional: true
    },
    thread: {
      type: 'string',
      optional: true
    },
    requestId: {
      type: 'string',
      optional: true
    },
    authorization: {
      type: 'string',
      optional: true
    },
    config: appConfigSchema
  }
}

const check = (new Validator()).compile({ec: executionContextSchema});

export function validateExecutionContext(execContext: ExecutionContextI): ValidationError[] | true | Promise<true | ValidationError[]> {
  return check(execContext);
}
