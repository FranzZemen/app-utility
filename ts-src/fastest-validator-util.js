export function isValidationSchema(schema) {
    return !('async' in schema);
}
export function isCheckFunction(check) {
    return 'async' in check;
}
export function isAsyncCheckFunction(check) {
    return check.async === true;
}
export function isSyncCheckFunction(check) {
    return check.sync === false;
}
//# sourceMappingURL=fastest-validator-util.js.map