import { FgCyan, FgGreen, FgMagenta, FgRed, FgYellow } from './color-constants.js';
export class NativeLogger {
    error(err, stacktrace, color = FgRed) {
        console.error(color, err, stacktrace);
    }
    warn(data, message, color = FgYellow) {
        console.warn(color, data, message);
    }
    info(data, message, color = FgGreen) {
        console.info(color, data, message);
    }
    debug(data, message, color = FgCyan) {
        console.debug(color, data, message);
    }
    trace(data, message, color = FgMagenta) {
        console.trace(color, data, message);
    }
}
//# sourceMappingURL=native-logger.js.map