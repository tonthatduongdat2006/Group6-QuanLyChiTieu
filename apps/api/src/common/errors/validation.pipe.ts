// DTO validation → 422 VALIDATION_ERROR với details theo trường (API v1.1 §1.4)
import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppError, type ErrorDetail } from './app-error';

function flatten(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).slice(0, 1).map((message) => ({ field, message }));
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

export const appValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  stopAtFirstError: true,
  exceptionFactory: (errors) => {
    const details = flatten(errors).map((d) =>
      d.message.includes('should not exist') ? { field: d.field, message: 'Trường này không được phép' } : d,
    );
    return new AppError('VALIDATION_ERROR', undefined, details);
  },
});
