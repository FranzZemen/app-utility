import Validator, {ValidationError, ValidationSchema} from 'fastest-validator';
import {ModuleDefinition, moduleDefinitionSchema} from '../load-from-module';

export interface LogOverrideConfigI {
  repo: string;
  level: string;
  source?: string;
  method?: string | string[];
  showHidden?: boolean;
  depth?: number;
}

// Configuration object and schema for fastest validator
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
    showHidden: {type: 'boolean', optional: true},
    depth: {type: 'number', optional: true}
  }
};



// See configuration object for options
export interface LogConfigI {
  loggerModule?: ModuleDefinition;
  level?: string;
  depth?: number;
  showHidden?: boolean;
  overrides?: LogOverrideConfigI[];
  flatten?: boolean;
  logAttributes?: {
    hideAppContext?: boolean,
    hideRepo?: boolean,
    hideSourceFile?: boolean,
    hideMethod?: boolean,
    hideThread?: boolean,
    hideRequestId?: boolean,
    hideLevel?: boolean
  };
}

// Configuration object && schema for fastest validator
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
    showHidden: {type: 'boolean', optional: true},
    depth: {type: 'number', optional: true},
    overrides: {
      type: 'array',
      optional: true,
      items: logOverrideSchema
    },
    flatten: {type: 'boolean', optional: true},
    logAttributes: {
      type: 'object',
      optional: true,
      props: {
        hideAppContext: {type: 'boolean', optional:true},
        hideRepo:  {type: 'boolean', optional:true},
        hideSourceFile:  {type: 'boolean', optional:true},
        hideMethod:  {type: 'boolean', optional:true},
        hideThread:  {type: 'boolean', optional:true},
        hideRequestId:  {type: 'boolean', optional:true},
        hideLevel:  {type: 'boolean', optional:true}
      }
    }
  }
};

const check = (new Validator()).compile({log: logConfigSchema});

export function validateLogConfig(logConfig: LogConfigI): ValidationError[] | true | Promise<true | ValidationError[]> {
  return check(logConfig);
}
