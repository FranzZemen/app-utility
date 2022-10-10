import {FgCyan, FgGreen, FgMagenta, FgRed, FgYellow, Reset} from './color-constants.js';
import {LoggerI} from './logger-adapter.js';


export class NativeLogger implements LoggerI {

  error(err, data?: any, color: string = FgRed) {
    if(data) {
      console.error(color, err, data);
    } else {
      console.error(color, err);
    }
  }

  warn(data, message?: string, color: string = FgYellow) {
    if(message) {
      console.warn(color, data);
    } else {
      console.warn(color, data, message);
    }
  }

  info(data, message?: string, color: string = FgGreen) {
    if(message) {
      console.info(color, data);
    } else {
      console.info(color, data, message);
    }
  }

  debug(data, message?: string, color: string = FgCyan) {
    if(message) {
      console.debug(color, data);
    } else {
      console.debug(color, data, message);
    }
  }

  trace(data, message?: string, color: string = FgMagenta) {
    if(message) {
      console.trace(color, data);
    } else {
      console.trace(color, data, message);
    }
  }
}

