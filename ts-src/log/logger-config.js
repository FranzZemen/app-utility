import Validator from 'fastest-validator';
import { moduleDefinitionSchema } from '../load-from-module.js';
export const logOverrideSchema = {
    type: 'object',
    optional: true,
    props: {
        level: {
            type: 'enum',
            values: ['none', 'error', 'warn', 'info', 'debug', 'trace']
        },
        repo: {
            type: 'string'
        },
        source: [{
                type: 'string', optional: true
            }, {
                type: 'array',
                optional: true,
                items: {
                    type: 'string'
                }
            }],
        method: [{
                type: 'string',
                optional: true
            }, {
                type: 'array',
                optional: true,
                items: {
                    type: 'string'
                }
            }],
        showHidden: { type: 'boolean', optional: true },
        depth: { type: 'number', optional: true }
    }
};
export const logConfigSchema = {
    type: 'object',
    optional: true,
    props: {
        loggerModule: moduleDefinitionSchema,
        level: {
            type: 'string',
            pattern: /^none|error|warn|info|debug|trace$/,
            optional: true
        },
        showHidden: { type: 'boolean', optional: true },
        depth: { type: 'number', optional: true },
        overrides: {
            type: 'array',
            optional: true,
            items: logOverrideSchema
        },
        flatten: { type: 'boolean', optional: true },
        logAttributes: {
            type: 'object',
            optional: true,
            props: {
                hideAppContext: { type: 'boolean', optional: true },
                hideRepo: { type: 'boolean', optional: true },
                hideSourceFile: { type: 'boolean', optional: true },
                hideMethod: { type: 'boolean', optional: true },
                hideThread: { type: 'boolean', optional: true },
                hideRequestId: { type: 'boolean', optional: true },
                hideLevel: { type: 'boolean', optional: true }
            }
        }
    }
};
const check = (new Validator()).compile({ log: logConfigSchema });
export function validateLogConfig(logConfig) {
    return check(logConfig);
}
//# sourceMappingURL=logger-config.js.map