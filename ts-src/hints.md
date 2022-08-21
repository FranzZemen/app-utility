# Hints
Hints support a text format to supply unary and binary key/value data.  The values can be
unquoted words, quoted words or JSON.  The JSON can be literal JSON or loaded from a resource.

## Installation

    npm i @franzzemen/app-utility

## Usage

    const myHints = new Hints('myKey="something useful" foo=bar useImportantStuff');
    or
    const myHints = Hints.parsehints('<<myPrefix myKey="something useful" foo=bar useImportantStuff>>');

## Details

## The Hints Class
The Hints class simply derives a Map and provides parsing functionality.

Hints are provided as text, and the Hints object constructor will parse them:

    const myHints = new Hints('someHint  key=value json-key={"hello":"world"] resource-key=@(MyJSON:./my-json.json)');

To support a wider array of usages, hints can be enclosed, in which case the static parseHints method should be used:

    const myHints = Hints.parseHints('<<some-prefix key=value>>', 'some-prefix');

The enclosing characters by default are '<<' and '>>', but can be set to anything desired:

    const myHints = Hints.parseHints('$key-value$', '', execContext, {start: '$', end:'$"}
    const myHints = Hints.parseHints('--->key-value<---', '', execContext, {start: '--->', end:'<---"}

# Whitespace
The whitespace between hints can be any kind and number of whitespace including spaces newlines, tabs etc.

    <<
        some 
        =
        whitespace
    >>

## Prefix
A prefix can provide context for the hints text.  When using the parseHints method, a prefix can be provided.  It is 
appended to the start enclosing characters.  If a prefix is used, it is also stored as a unary hint and follows all 
the rules of a unary hint.  It is also stored as binary value with key 'prefix'.

## Unary Hints
Unary hints are just that, unary.  Their presence or absence might mean something to the user.  Prefixes, if used, 
are stored as unary hints as well.

    <<my-prefix include-fun-stuff>>

Unary hints follow a dashed-format.  They can be only lower case or numbers or dashes, and cannot start or end with 
a dash.  Multiple dashes are allowed, if however that feature is not purposeful:

    <<this---is-valid>>

Unary hints must be at least 2 characters long.

## Binary Hints
Binary hints have a key and a value, and are separate by the equals sign "=".  Any kind of whitespace can separate 
the key, the = sign and the value.

Keys have the same formatting restrictions as unary hints.

Values can be unquoted, quoted, literal JSON or JSON references.

### Unquoted Values
Unquoted values are a single word made up of any number of lower or upper case english alphabet characters, the 
digits 0 to 9, the dash "-", the underscore "_" or the dot "." with no restrictions on starting ending or middle 
characters. More allowances may be made later.

Examples:

    key=value
    path=some.path
    option=_reference

### Quoted Values
Quoted values are multiple words made up of any number of lower or upper case english alphabet characters, the 
digits 0 to 9, the dash "-", the underscore "_" or the dot ".", with no restrictions on placement in the quotes.  
The whitespace can be any kind of whitespace including line breaks, page breaks,tabs etc.

Examples:

    key="value"
    key="my value"
    phrase = "say hello"
    phrase = "say\t\thello\r\nok"

### JSON
JSON is just that, legal JSON, which must start and end either with a [ and ] or { and }.

The JSON will be parsed using JSON.parse.  A with anything else in hints and JSON itself, the JSON accepts any kind 
and quantity of whitespace.

Examples:

    <<object-def options={"option1": true, "option2": 5.0, "option3": "Hello World"}>>

### JSON references
Large JSON objects can be cumbersome in hints, so it can be looked up as a resource.  

For example:

    resource-key=@(require:./my-json.json)

To indicate we're loading a resource, the value begins with the '@' symbol.  The reference is enclosed in regular 
brackets ( and ).  A protocol is then provided.  In this case, the protocol is the node module loader indicated by 
"require:".  Finally, the resource itself is specified, in this case ".my-json.json".

The following protocols are currently supported:

- Node Module Loader with a relative path to a json file
- Node Module Loader to a package & function that returns a stringified JSON object **
- Node Module Loader to a pacakge & attribute that is a stringified JSON object **

** While we might accept objects, this opens too wide a door on potential vulnerabilities.  Thus we force a string 
to be passed, which will be parsed through JSON.parse.

#### Node Module Loader with a relative path to json file
This protocol takes advantage of the fact that the Node Module Loader can load JSON directly from a local resource.  
The general format is:

    @(require:RESOURCE)

    Where:
    RESOURCE:  Is the resource to be loaded
    Everythign else should be entered as is

The RESOURCE to be loaded is a file ending in .json and contains valid json.

    my-options=@(require:./my resources/options.json)

This package will enforce the json suffix.  The module loader will enforce that it resolves to JSON and fail if it 
finds code.

Note that the load is happening from the root of the @franzzemen/base-utility package.  This means that usually at a 
minimum you will need to provide a relative path that exits base-utility, exits @franzzemen and exits node_modules:

    my-options=@(require:../../../resources/options.json)

#### Node Module Loader with package/function that returns a stringified JSON
For those that want to organize JSON objects into a package, which can make sense in an enterprise setting or larger
project, Hints support the ability to load stringified JSON, which is then parsed.  Existing objects are not 
supported, only text to be parsed as JSON.  The format for this mode is:

    my-options=@(require:package=>functonName)

    where: 
        package is the package name 
        functionName is a function that takes no arguments and return stringified JSON

    my-options=@(require:@franzzemen/extensions=>getCustomOptions)

At this time the function must be a top leve function, not accessed through a dot "." or array.

#### Node Module Loader with package/property that contains a stringified JSON
More simply if one has a package where they store their static JSON objects, they can do so as stringified objects and 
refer to a property on the package. At this time the property must be a top level property (i.e. not referenced via 
a dot "." or array)

    my-options=@(require:package:propertyPath)

    where: 
        package is the package name 
        propertyPath is the path to the stringified JSON

    my-options=@(require:@franzzemen/extensions:JSONData)       


