import { ExecutionContextI } from './execution-context.js';
import { ModuleDefinition } from './load-from-module.js';
export declare enum LoadPackageType {
    json = "json",
    package = "object"
}
export declare type ModuleResolutionSetter = ((result: any | Promise<any>, ...params: any[]) => true | Promise<true>);
export interface PendingModuleResolution {
    ownerIsObject: boolean;
    ownerThis: any;
    ownerSetter: string | ModuleResolutionSetter;
    paramsArray?: any[];
    module: ModuleDefinition;
    loadPackageType?: LoadPackageType;
}
interface ModuleResolutionResult {
    resolution: PendingModuleResolution;
    loaded: boolean;
    resolved: boolean;
    resolvedObject?: any;
    error?: Error;
}
export declare class ModuleResolver {
    pendingResolutions: PendingModuleResolution[];
    moduleResolutionPromises: Promise<ModuleResolutionResult>[];
    constructor();
    private static invokeSetter;
    add(pendingResolution: PendingModuleResolution, ec: any): void;
    resolve(ec?: ExecutionContextI): Promise<PendingModuleResolution>[];
    clear(): void;
}
export {};
