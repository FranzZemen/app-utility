import Validator from 'fastest-validator';
import { appConfigSchema } from './app-config.js';
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
};
const check = (new Validator()).compile({ ec: executionContextSchema });
export function validateExecutionContext(execContext) {
    return check(execContext);
}
//# sourceMappingURL=execution-context.js.map