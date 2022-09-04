import {FgCyan, FgGreen, FgMagenta, FgRed, FgYellow, Reset} from './color-constants.js';
import {LoggerI} from './logger-adapter.js';


export class NativeLogger implements LoggerI {

  error(err, stacktrace?: any, color: string = FgRed) {
    console.error(color, err, stacktrace);
  }

  warn(data, message?: string, color: string = FgYellow) {
    console.warn(color, data, message);
  }

  info(data, message?: string, color: string = FgGreen) {
    console.info(color, data, message);
  }

  debug(data, message?: string, color: string = FgCyan) {
    console.debug(color, data, message);
  }

  trace(data, message?: string, color: string = FgMagenta) {
     console.trace(color, data, message);
  }
}

