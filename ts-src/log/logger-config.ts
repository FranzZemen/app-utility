import Validator, {ValidationError, ValidationSchema} from 'fastest-validator';
import {ModuleDefinition, moduleDefinitionSchema} from '../load-from-module';

export interface LogOverrideConfigI {
  // The repo to override logging for
  repo: string;
  // The level to override
  level: string;
  // The source to override logging for (optional)
  source?: string;
  // The method to override logging for (optional)
  method?: string | string[];
  // Whether inspect should show hidden properties for this override (optional)
  showHidden?: boolean;
  // The override for object depth inspect will use
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
  // If present, loads the logger implementation pointed to by ModuleDefinition
  loggerModule?: ModuleDefinition;
  // The log level to log.  Available levels are 'none', 'error', 'warn','info', 'debug' and 'trace'
  level?: string;
  // The object depth to log when logging object properties
  depth?: number;
  // Whether node's inspect method should show hidden attributes
  showHidden?: boolean;
  // Logging overrides
  overrides?: LogOverrideConfigI[];
  // The log attributes are 'flattened' into a single line, not logged as an object along with the data
  flatten?: boolean;
  // The log attributes logging flags
  logAttributes?: {
    // If true or missing, logs the appContext from the Execution Context
    hideAppContext?: boolean,
    // If true or missing, logs the repo supplied to the LoggingAdapter constructor
    hideRepo?: boolean,
    // If true or missing, logs the source file supplied to the LoggingAdapter constructor
    hideSourceFile?: boolean,
    // If true or missing, logs the method supplied to the LoggingAdapter constructor
    hideMethod?: boolean,
    // If true or missing, logs thread from the Execution Context
    hideThread?: boolean,
    // If true or missing, logs requestId from the Execution Context
    hideRequestId?: boolean,
    // If true or missing, logs the debug level
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
