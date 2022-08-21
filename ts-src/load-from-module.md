# Loading modules
The @franzzemen packages often provide extensible functionality that can be defined and loaded from local or well 
known packages.  This is the purpose of the load-from-module.ts module and the associated loadFromModule function.

To load a module dynamically, one invokes loadFromModule:

    function loadFromModule<T>(moduleDef: ModuleDefinition, paramsArray?: any[]): T;

The Module Definition specifies which module to load and which factory function or constructor to call to obtain and 
instance of T, with the paramsArray being an array of parameters to pass to the factory function or constructor.  The 
parametric variable T indicates the type of instance returned.

The Module Definition is:

    type ModuleDefinition = {
        moduleName: string, 
        functionName?: string, 
        constructorName?: string, 
        propertyName?:string
    };

    where:
        moduleName: 
            a) The name of the installed module in node_modules or b) a relative path to the a local module
            or 
            b) The path to the local module.  When providing the path to a local module, it should be noted that the
            path is relative to the installed @franzzemen/app-utility root, which normally would be located in 
            "node_modules/@franzzemen/app-utlity".  Thus if the module to load is in, for example,"publish/core/some-module.js"
            then the moduleName would be "../../../publish/core/some-mobule".  This can be troublesome if one is not 
            careful with npm - for instance if you end up having multiple versions of @franzzemen/app-utility supporting
            multiple versions of modules including it, because in that case the relative paths would be ambiguous.  
            i.e. if you have an old version of @franzzemen/re-expression including an older version of app-utility, 
            then its @franzzemen/app-utility entry would not be right under the topmost node_modules, but would be in
            "node_modules/@franzzemen/expression/node_modules/@franzzemen/app-utility".  You can imagine that it 
            would be difficult to know which instance would actually load your modules!  So keep your repos clean 
            and collectively up to compatible versions!

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


da
