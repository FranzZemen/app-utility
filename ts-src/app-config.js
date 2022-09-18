import Validator from 'fastest-validator';
import { logConfigSchema } from './log/index.js';
export const appConfigSchema = {
    type: 'object',
    optional: true,
    props: {
        log: logConfigSchema,
    }
};
const check = (new Validator()).compile({ app: appConfigSchema });
export function validateAppConfig(appConfig) {
    return check(appConfig);
}
//# sourceMappingURL=app-config.js.map