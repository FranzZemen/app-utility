# Load From Module

The @franzzemen packages often provide extensible functionality which can be defined externally and loaded dynamically.
The load-from-module module provides that capability. However, this is not a general module loader
(import () or require()). Instead it expects the external functionality to be exposed in one of several factory
patterns:

1. Load a JSON object. This is the simplest format, and pretty much just encapsulates require(jason url);
2. Load a JSON object from another package. JSON can be loaded from another package that may provide statically or
   dynamically.
3. Load a factory object to obtain a new instance. A factory is exposed either as a factory function or a constructor
   and a new instance of the object is created from those.

## Module Definition

The Module Definition specification is:

    type ModuleDefinition = {
        moduleName: string, 
        functionName?: string, 
        constructorName?: string, 
        propertyName?:string,
        moduleResolution?: string | ModuleResolution
    };

    where:
        moduleName:  The moduleName is the name of either an installed package or a relative path, or JSON file.
        functionName:  The name of the factory function in the loaded module.  Not used for JSON files.
        constructorName:  The name of the factory constructor in the loaded module.  Not used for JSON files or modules providing JSON properties.
        propertyName:  The name of a JSON property in the loaded module
        moduleResolution:  The module type of the loaded module. Either 'commonjs' or 'es' or a value from the enum ModuleResolution.

## Module Resolution
With the advent of support for ES modules, module resolution specification becomes important, whereas prior to this
commonjs was assumed. ES modules cannot dynamically import from other modules without becoming asynchronous, through the
import() build in method. CommonJS modules can can be imported synchronously via require/createRequire from either.

Rather than try and parse the outcome, a module resolution specification is required for ES modules to be loaded. If it
is missing or a commonjs specification, commonjs is assumed. Thus loading from a module anything but JSON will convert
processing to asynchronous if the target is an ES module.

### Relative Paths
Because ultimately require or import() will be used, moduleName is an installed package, a URL, an absolute path, or it
is relative to the location of the @franzzemen/app-utility/load-from-module.js module, per node standard. Since most of
the time one would be using relative paths from a given package, the relative path would normally begin with '../../../'
to travel back to app-utility then to @franzzemen and finally out of the top node_modules folder.

For relative paths, it is important to remember that if you let your node packages fall out of sync, you may end up with
@franzzemen packages in nested node_module folders. Either a) keep your packages will updated or only import the top
most @franzzemen package you need that itself will install @franzzemen/app-utility, OR don't use relative paths.  
Otherwise, depending on which node_modules is used by the package loader, your relative paths may not be right. 

## Loading JSON

      loadJSONResource(relativePath, ec?: ExecutionContextI): Object

This is simply a wrapper to require (obtained through createRequire)

### Factory Function
If a F

        functionName:  
            If supplied, constructorName will be ignored.  This is the name of the ** factory ** function 
            inside the module that will be invoked along with the paramsArray to create the desired instance of 
            whatever it is the module is meant to load.  ** Again, this function is a factory function, not the actual 
            instance of whatever it is you are trying to load **.  Obviously you can implement any factory function 
            you wish, as long as it meets the target criteria in question.

        constructorName:
            If supplied, functionName should be undefined.  It represents a constructor (class) name exported by the 
            module that can be invoked to get an instance of the class desired.

        propertyName:
            This is not used in the loadFromModule function.  It is used in the loadJSONFromPackage function.

The @franzzemen packages often provide extensible functionality that can be defined and loaded from local or well known
packages. This is the purpose of the load-from-module.ts module and the associated loadFromModule function.

The modul

To load a module dynamically, one invokes loadFromModule:

    function loadFromModule<T>(moduleDef: ModuleDefinition, paramsArray?: any[]): T;

The Module Definition specifies which module to load and which factory function or constructor to call to obtain and
instance of T, with the paramsArray being an array of parameters to pass to the factory function or constructor. The
parametric variable T indicates the type of instance returned.

da
