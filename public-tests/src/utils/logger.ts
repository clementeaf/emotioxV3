export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  component: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, data?: unknown, component: string = 'QuestionComponent'): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      component
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    if (this.isProduction) return level === LogLevel.ERROR || level === LogLevel.WARN;
    return false;
  }

  private log(level: LogLevel, message: string, data?: unknown, component?: string): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatMessage(level, message, data, component);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${entry.component}] 🔍 ${entry.message}`, entry.data);
        break;
      case LogLevel.INFO:
        console.info(`[${entry.component}] ℹ️ ${entry.message}`, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(`[${entry.component}] ⚠️ ${entry.message}`, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(`[${entry.component}] ❌ ${entry.message}`, entry.data);
        break;
    }
  }

  debug(message: string, data?: unknown, component?: string): void {
    this.log(LogLevel.DEBUG, message, data, component);
  }

  info(message: string, data?: unknown, component?: string): void {
    this.log(LogLevel.INFO, message, data, component);
  }

  warn(message: string, data?: unknown, component?: string): void {
    this.log(LogLevel.WARN, message, data, component);
  }

  error(message: string, data?: unknown, component?: string): void {
    this.log(LogLevel.ERROR, message, data, component);
  }
}

// 🎯 INSTANCIA SINGLETON DEL LOGGER
export const logger = new Logger();

// 🎯 HOOK PERSONALIZADO PARA LOGGING EN COMPONENTES
export const useLogger = (componentName: string = 'QuestionComponent') => {
  return {
    debug: (message: string, data?: unknown) => logger.debug(message, data, componentName),
    info: (message: string, data?: unknown) => logger.info(message, data, componentName),
    warn: (message: string, data?: unknown) => logger.warn(message, data, componentName),
    error: (message: string, data?: unknown) => logger.error(message, data, componentName)
  };
};
