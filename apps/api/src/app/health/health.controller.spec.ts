import type { Mock } from 'vitest';
import { HttpStatus, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DATABASE, Database } from '@birthday/api-database';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const db: { execute: Mock<Database['execute']> } = {
    execute: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DATABASE, useValue: db }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports ok when the database responds', async () => {
    db.execute.mockResolvedValue({} as Awaited<ReturnType<Database['execute']>>);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
  });

  it('throws 503 with an error status when the database is unavailable', async () => {
    db.execute.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const error = await controller.check().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({ status: 'error' });
  });

  it('logs the database error when the check fails', async () => {
    const dbError = new Error('connect ECONNREFUSED');
    db.execute.mockRejectedValue(dbError);

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);

    expect(Logger.prototype.error).toHaveBeenCalledWith({ err: dbError }, 'The database is unavailable');
  });
});
