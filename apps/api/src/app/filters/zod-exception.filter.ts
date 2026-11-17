import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';

// Controllers parse request bodies with zod schemas; a body that fails one is the client's mistake, so it gets 400 with
// the fields that are wrong instead of a 500.
@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  public catch(error: ZodError, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.BAD_REQUEST)
      .json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'The request is invalid',
        issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      });
  }
}
