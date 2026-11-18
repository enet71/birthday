import type { Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import { PG_BOSS } from '@birthday/api-jobs';
import { BACKGROUND_SYNC_INTERVAL_MS, BACKGROUND_SYNC_QUEUE, FIRST_SYNC_QUEUE, POLL_QUEUE } from '../constants';
import { GoogleAccessRevokedError } from '../errors';
import { GoogleCalendarEventsService } from './google-calendar-events.service';
import { GoogleCalendarJobsService } from './google-calendar-jobs.service';
import { GoogleConnectionsService } from './google-connections.service';
import { GoogleImportService } from './google-import.service';

type JobHandler = (jobs: { data: { userId: string } }[]) => Promise<void>;

const NOW = new Date('2026-11-18T12:00:00.000Z');

describe('GoogleCalendarJobsService', () => {
  let service: GoogleCalendarJobsService;
  const boss: { createQueue: Mock; updateQueue: Mock; schedule: Mock; work: Mock; insert: Mock; send: Mock } = {
    createQueue: vi.fn(),
    updateQueue: vi.fn(),
    schedule: vi.fn(),
    work: vi.fn(),
    insert: vi.fn(),
    send: vi.fn(),
  };
  const connections: {
    findDueForSync: Mock<GoogleConnectionsService['findDueForSync']>;
    isConnected: Mock<GoogleConnectionsService['isConnected']>;
  } = {
    findDueForSync: vi.fn(),
    isConnected: vi.fn(),
  };
  const importService: { runSync: Mock<GoogleImportService['runSync']> } = { runSync: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);

    const moduleRef = await Test.createTestingModule({
      providers: [
        GoogleCalendarJobsService,
        { provide: PG_BOSS, useValue: boss },
        { provide: GoogleConnectionsService, useValue: connections },
        { provide: GoogleCalendarEventsService, useValue: {} },
        { provide: GoogleImportService, useValue: importService },
      ],
    }).compile();

    service = moduleRef.get(GoogleCalendarJobsService);
    await service.onApplicationBootstrap();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The worker pg-boss would call for the queue's jobs.
  function workerOf(queue: string): JobHandler {
    const call = boss.work.mock.calls.find(([name]) => name === queue);

    return call?.at(-1) as JobHandler;
  }

  function runJob(queue: string, userId?: string): Promise<void> {
    return workerOf(queue)(userId ? [{ data: { userId } }] : []);
  }

  describe('poll', () => {
    it('queues one background sync per due user, keyed by the user', async () => {
      connections.findDueForSync.mockResolvedValue(['user-1', 'user-2']);

      await runJob(POLL_QUEUE);

      expect(connections.findDueForSync).toHaveBeenCalledWith(new Date(NOW.getTime() - BACKGROUND_SYNC_INTERVAL_MS), 50);
      expect(boss.insert).toHaveBeenCalledWith(BACKGROUND_SYNC_QUEUE, [
        { data: { userId: 'user-1' }, singletonKey: 'user-1' },
        { data: { userId: 'user-2' }, singletonKey: 'user-2' },
      ]);
    });

    it('queues nothing when no user is due', async () => {
      connections.findDueForSync.mockResolvedValue([]);

      await runJob(POLL_QUEUE);

      expect(boss.insert).not.toHaveBeenCalled();
    });

    it('declares the poll queue as stately and the background sync queue as short, so jobs do not pile up', () => {
      expect(boss.createQueue).toHaveBeenCalledWith(POLL_QUEUE, expect.objectContaining({ policy: 'stately' }));
      expect(boss.createQueue).toHaveBeenCalledWith(BACKGROUND_SYNC_QUEUE, expect.objectContaining({ policy: 'short' }));
    });
  });

  describe('background sync', () => {
    it('reads only the changes, at most once per background interval', async () => {
      importService.runSync.mockResolvedValue({ added: 0, updated: 0, deleted: 0 });

      await runJob(BACKGROUND_SYNC_QUEUE, 'user-1');

      expect(importService.runSync).toHaveBeenCalledWith('user-1', { minIntervalMs: BACKGROUND_SYNC_INTERVAL_MS, full: false });
    });

    it('ends without a retry when Google revoked the access', async () => {
      importService.runSync.mockRejectedValue(new GoogleAccessRevokedError('Google revoked the access'));

      await expect(runJob(BACKGROUND_SYNC_QUEUE, 'user-1')).resolves.toBeUndefined();
    });

    it('fails on other errors', async () => {
      importService.runSync.mockRejectedValue(new Error('Google is down'));

      await expect(runJob(BACKGROUND_SYNC_QUEUE, 'user-1')).rejects.toThrow('Google is down');
    });
  });

  describe('first sync', () => {
    it('reads every contact and exports every birthday', async () => {
      importService.runSync.mockResolvedValue({ added: 1, updated: 0, deleted: 0 });

      await runJob(FIRST_SYNC_QUEUE, 'user-1');

      expect(importService.runSync).toHaveBeenCalledWith('user-1', { minIntervalMs: 0, full: true });
    });

    it('fails, so pg-boss retries it, when another sync of the still connected user holds the lease', async () => {
      importService.runSync.mockResolvedValue(null);
      connections.isConnected.mockResolvedValue(true);

      await expect(runJob(FIRST_SYNC_QUEUE, 'user-1')).rejects.toThrow();
    });

    it('ends when it was skipped because the user is no longer connected', async () => {
      importService.runSync.mockResolvedValue(null);
      connections.isConnected.mockResolvedValue(false);

      await expect(runJob(FIRST_SYNC_QUEUE, 'user-1')).resolves.toBeUndefined();
    });
  });
});
