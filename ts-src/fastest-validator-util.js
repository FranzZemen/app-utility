export function isLoadSchema(schema) {
    return typeof schema === 'object' && schema !== undefined && 'useNewCheckerFunction' in schema && 'validationSchema' in schema;
}
export function isCheckFunction(check) {
    return check !== undefined && 'async' in check;
}
export function isAsyncCheckFunction(check) {
    return check.async === true;
}
export function isSyncCheckFunction(check) {
    return check.async === false;
}
//# sourceMappingURL=fastest-validator-util.js.map