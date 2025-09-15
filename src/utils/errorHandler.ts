// Sistema de manejo de errores centralizado para TokiTask

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  CONFIGURATION = 'CONFIGURATION',
  FIREBASE = 'FIREBASE',
  GEMINI_API = 'GEMINI_API',
  UNKNOWN = 'UNKNOWN'
}

export interface ErrorContext {
  userId?: string;
  operation?: string;
  component?: string;
  attempt?: number;
  maxRetries?: number;
  additionalData?: unknown;
  [key: string]: unknown;
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: ErrorContext;
  timestamp: Date;
  retryable: boolean;
}

/**
 * Clase base para errores de la aplicación
 */
export class TokiTaskError extends Error {
  public readonly type: ErrorType;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    type: ErrorType,
    message: string,
    originalError?: Error,
    context?: ErrorContext,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'TokiTaskError';
    this.type = type;
    this.context = context;
    this.timestamp = new Date();
    this.retryable = retryable;

    // Mantener el stack trace correcto
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Errores específicos por tipo
 */
export class NetworkError extends TokiTaskError {
  constructor(message: string, originalError?: Error, context?: ErrorContext) {
    super(ErrorType.NETWORK, message, originalError, context, true);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends TokiTaskError {
  constructor(message: string, originalError?: Error, context?: ErrorContext) {
    super(ErrorType.AUTHENTICATION, message, originalError, context, false);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends TokiTaskError {
  constructor(message: string, context?: ErrorContext) {
    super(ErrorType.VALIDATION, message, undefined, context, false);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends TokiTaskError {
  constructor(message: string, context?: ErrorContext) {
    super(ErrorType.CONFIGURATION, message, undefined, context, false);
    this.name = 'ConfigurationError';
  }
}

export class FirebaseError extends TokiTaskError {
  constructor(message: string, originalError?: Error, context?: ErrorContext) {
    super(ErrorType.FIREBASE, message, originalError, context, true);
    this.name = 'FirebaseError';
  }
}

export class GeminiAPIError extends TokiTaskError {
  constructor(message: string, originalError?: Error, context?: ErrorContext) {
    super(ErrorType.GEMINI_API, message, originalError, context, true);
    this.name = 'GeminiAPIError';
  }
}

/**
 * Utilidades para crear errores
 */
export const ErrorFactory = {
  network: (message: string, originalError?: Error, context?: ErrorContext) =>
    new NetworkError(message, originalError, context),

  auth: (message: string, originalError?: Error, context?: ErrorContext) =>
    new AuthenticationError(message, originalError, context),

  validation: (message: string, context?: ErrorContext) =>
    new ValidationError(message, context),

  config: (message: string, context?: ErrorContext) =>
    new ConfigurationError(message, context),

  firebase: (message: string, originalError?: Error, context?: ErrorContext) =>
    new FirebaseError(message, originalError, context),

  gemini: (message: string, originalError?: Error, context?: ErrorContext) =>
    new GeminiAPIError(message, originalError, context),

  unknown: (message: string, originalError?: Error, context?: ErrorContext) =>
    new TokiTaskError(ErrorType.UNKNOWN, message, originalError, context, false)
};

/**
 * Utilidades para identificar tipos de error
 */
export const ErrorUtils = {
  isRetryable: (error: Error): boolean => {
    return error instanceof TokiTaskError && error.retryable;
  },

  isNetworkError: (error: Error): boolean => {
    return error instanceof NetworkError ||
           (error instanceof TokiTaskError && error.type === ErrorType.NETWORK);
  },

  isAuthError: (error: Error): boolean => {
    return error instanceof AuthenticationError ||
           (error instanceof TokiTaskError && error.type === ErrorType.AUTHENTICATION);
  },

  isValidationError: (error: Error): boolean => {
    return error instanceof ValidationError ||
           (error instanceof TokiTaskError && error.type === ErrorType.VALIDATION);
  },

  getErrorType: (error: Error): ErrorType => {
    if (error instanceof TokiTaskError) {
      return error.type;
    }
    return ErrorType.UNKNOWN;
  },

  getUserFriendlyMessage: (error: Error): string => {
    if (error instanceof TokiTaskError) {
      switch (error.type) {
        case ErrorType.NETWORK:
          return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
        case ErrorType.AUTHENTICATION:
          return 'Error de autenticación. Por favor, inicia sesión nuevamente.';
        case ErrorType.AUTHORIZATION:
          return 'No tienes permisos para realizar esta acción.';
        case ErrorType.VALIDATION:
          return error.message;
        case ErrorType.CONFIGURATION:
          return 'Error de configuración. Contacta al soporte técnico.';
        case ErrorType.FIREBASE:
          return 'Error en la base de datos. Los cambios no se guardaron.';
        case ErrorType.GEMINI_API:
          return 'Error en el servicio de IA. Revisa la configuración de la API.';
        default:
          return 'Ha ocurrido un error inesperado. Inténtalo nuevamente.';
      }
    }
    return error.message || 'Ha ocurrido un error inesperado.';
  }
};

/**
 * Logger de errores mejorado
 */
export const ErrorLogger = {
  log: (error: Error, context?: ErrorContext) => {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: error instanceof TokiTaskError ? error.type : ErrorType.UNKNOWN,
      timestamp: new Date().toISOString(),
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    };

    // En desarrollo, loguear en consola
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 TokiTask Error:', errorInfo);
    }

    // Aquí podrías enviar a un servicio de logging como Sentry, LogRocket, etc.
    // logToExternalService(errorInfo);
  },

  logAsync: async (error: Error, context?: ErrorContext) => {
    try {
      ErrorLogger.log(error, context);
    } catch (loggingError) {
      console.error('Error logging failed:', loggingError);
    }
  }
};

/**
 * Utilidad para retry con backoff exponencial
 */
export const RetryUtils = {
  withRetry: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    backoffFactor: number = 2
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (!ErrorUtils.isRetryable(lastError) || attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(backoffFactor, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        ErrorLogger.log(lastError, {
          attempt: attempt + 1,
          maxRetries,
          delay,
          operation: operation.name || 'anonymous'
        });
      }
    }

    throw lastError!;
  }
};

/**
 * Wrapper para operaciones asíncronas con manejo de errores
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const appError = error instanceof TokiTaskError
      ? error
      : ErrorFactory.unknown(
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error : undefined,
          context
        );

    ErrorLogger.log(appError, context);
    throw appError;
  }
};

/**
 * Hook personalizado para manejo de errores en componentes
 */
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: ErrorContext) => {
    ErrorLogger.log(error, context);
    return ErrorUtils.getUserFriendlyMessage(error);
  };

  const handleAsyncError = async <T>(
    operation: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> => {
    return withErrorHandling(operation, context);
  };

  return {
    handleError,
    handleAsyncError,
    isRetryable: ErrorUtils.isRetryable,
    isNetworkError: ErrorUtils.isNetworkError,
    isAuthError: ErrorUtils.isAuthError,
    isValidationError: ErrorUtils.isValidationError
  };
};