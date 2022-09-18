import { ValidationError } from 'fastest-validator';
import { ModuleDefinition } from '../load-from-module.js';
export interface LogOverrideConfigI {
    repo: string;
    level: string;
    source?: string;
    method?: string | string[];
    showHidden?: boolean;
    depth?: number;
}
export declare const logOverrideSchema: {
    type: string;
    optional: boolean;
    props: {
        level: {
            type: string;
            values: string[];
        };
        repo: {
            type: string;
        };
        source: ({
            type: string;
            optional: boolean;
            items?: undefined;
        } | {
            type: string;
            optional: boolean;
            items: {
                type: string;
            };
        })[];
        method: ({
            type: string;
            optional: boolean;
            items?: undefined;
        } | {
            type: string;
            optional: boolean;
            items: {
                type: string;
            };
        })[];
        showHidden: {
            type: string;
            optional: boolean;
        };
        depth: {
            type: string;
            optional: boolean;
        };
    };
};
export interface LogConfigI {
    loggerModule?: ModuleDefinition;
    level?: string;
    depth?: number;
    showHidden?: boolean;
    overrides?: LogOverrideConfigI[];
    flatten?: boolean;
    logAttributes?: {
        hideAppContext?: boolean;
        hideRepo?: boolean;
        hideSourceFile?: boolean;
        hideMethod?: boolean;
        hideThread?: boolean;
        hideRequestId?: boolean;
        hideLevel?: boolean;
    };
}
export declare const logConfigSchema: {
    type: string;
    optional: boolean;
    props: {
        loggerModule: {
            type: string;
            optional: boolean;
            props: {
                moduleName: {
                    type: string;
                    optional: boolean;
                };
                functionName: {
                    type: string;
                    optional: boolean;
                };
                constructorName: {
                    type: string;
                    optional: boolean;
                };
                propertyName: {
                    type: string;
                    optional: boolean;
                };
            };
        };
        level: {
            type: string;
            pattern: RegExp;
            optional: boolean;
        };
        showHidden: {
            type: string;
            optional: boolean;
        };
        depth: {
            type: string;
            optional: boolean;
        };
        overrides: {
            type: string;
            optional: boolean;
            items: {
                type: string;
                optional: boolean;
                props: {
                    level: {
                        type: string;
                        values: string[];
                    };
                    repo: {
                        type: string;
                    };
                    source: ({
                        type: string;
                        optional: boolean;
                        items?: undefined;
                    } | {
                        type: string;
                        optional: boolean;
                        items: {
                            type: string;
                        };
                    })[];
                    method: ({
                        type: string;
                        optional: boolean;
                        items?: undefined;
                    } | {
                        type: string;
                        optional: boolean;
                        items: {
                            type: string;
                        };
                    })[];
                    showHidden: {
                        type: string;
                        optional: boolean;
                    };
                    depth: {
                        type: string;
                        optional: boolean;
                    };
                };
            };
        };
        flatten: {
            type: string;
            optional: boolean;
        };
        logAttributes: {
            type: string;
            optional: boolean;
            props: {
                hideAppContext: {
                    type: string;
                    optional: boolean;
                };
                hideRepo: {
                    type: string;
                    optional: boolean;
                };
                hideSourceFile: {
                    type: string;
                    optional: boolean;
                };
                hideMethod: {
                    type: string;
                    optional: boolean;
                };
                hideThread: {
                    type: string;
                    optional: boolean;
                };
                hideRequestId: {
                    type: string;
                    optional: boolean;
                };
                hideLevel: {
                    type: string;
                    optional: boolean;
                };
            };
        };
    };
};
export declare function validateLogConfig(logConfig: LogConfigI): ValidationError[] | true | Promise<true | ValidationError[]>;
