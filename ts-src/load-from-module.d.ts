import { ValidationSchema } from 'fastest-validator';
import { ExecutionContextI } from './execution-context.js';
import { CheckFunction } from './fastest-validator-util.js';
export declare enum ModuleResolution {
    commonjs = "commonjs",
    es = "es",
    json = "json"
}
export interface LoadSchema {
    validationSchema: ValidationSchema;
    useNewCheckerFunction: boolean;
}
export declare class TypeOf extends Set<string> {
    static String: TypeOf;
    static Number: TypeOf;
    static Boolean: TypeOf;
    static BigInt: TypeOf;
    static Function: TypeOf;
    static Symbol: TypeOf;
    static Object: TypeOf;
    private constructor();
    private _typeOf;
    get typeOf(): string;
    add(value: string): this;
    clear(): void;
    delete(value: string): boolean;
}
export declare function isTypeOf(typeOf: any | TypeOf): typeOf is TypeOf;
export declare type ModuleDefinition = {
    moduleName: string;
    functionName?: string;
    constructorName?: string;
    propertyName?: string;
    moduleResolution?: ModuleResolution;
    paramsArray?: any[];
    loadSchema?: LoadSchema | TypeOf | CheckFunction;
};
export declare function isModuleDefinition(module: any | ModuleDefinition): module is ModuleDefinition;
export declare function isConstrainedModuleDefinition(module: any | ModuleDefinition): module is ModuleDefinition;
export declare const moduleDefinitionSchema: {
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
export declare function loadJSONResource(relativePath: any, check?: LoadSchema | CheckFunction, ec?: ExecutionContextI): Object | Promise<Object>;
export declare function loadJSONFromPackage(moduleDef: ModuleDefinition, ec?: ExecutionContextI): Object | Promise<Object>;
export declare function loadFromModule<T>(moduleDef: ModuleDefinition, ec?: ExecutionContextI): Promise<T> | T;
