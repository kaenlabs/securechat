import { Request, Response, NextFunction } from 'express';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AppError } from './error.middleware';

export const validateDto = <T extends object>(dtoClass: ClassConstructor<T>) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(dtoClass, req.body);

    const errors: ValidationError[] = await validate(dtoInstance);

    if (errors.length > 0) {
      const messages = errors
        .map((error) => Object.values(error.constraints || {}))
        .flat()
        .join(', ');

      return next(new AppError(`Validation failed: ${messages}`, 400));
    }

    // Replace req.body with validated and transformed DTO
    req.body = dtoInstance;
    next();
  };
};
