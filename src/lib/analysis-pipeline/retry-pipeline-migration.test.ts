import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260831222126_den_118_retry_settled_partial.sql',
);

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

async function createDatabase() {
  const database = new PGlite();
  await database.exec(`
    create role anon nologin;
    create role authenticated nologin;

    create schema auth;
    create schema private;

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create table public.analysis_intakes (
      id uuid primary key,
      user_id uuid not null
    );
    create table public.analysis_jobs (
      id uuid primary key,
      analysis_id uuid not null unique references public.analysis_intakes(id),
      user_id uuid not null,
      status text not null,
      stage text not null,
      attempt integer not null,
      revision integer not null,
      workflow_run_id text,
      error_code text,
      started_at timestamptz,
      completed_at timestamptz
    );
    create table public.billing_entitlement_periods (
      id uuid primary key,
      analysis_limit integer not null
    );
    create table public.analysis_usage_reservations (
      id uuid primary key,
      analysis_id uuid not null unique references public.analysis_intakes(id),
      job_id uuid not null unique references public.analysis_jobs(id),
      user_id uuid not null,
      entitlement_period_id uuid not null references public.billing_entitlement_periods(id),
      status text not null
    );
    create table public.analysis_artifacts (
      id uuid primary key,
      analysis_id uuid not null references public.analysis_intakes(id),
      status text not null,
      content jsonb,
      error_code text,
      generated_at timestamptz
    );

    create table public.usage_ledger (
      idempotency_key text primary key,
      user_id uuid not null,
      entitlement_period_id uuid not null,
      reservation_id uuid not null,
      job_id uuid,
      event_type text not null,
      quantity integer not null,
      source text not null,
      status text not null,
      remaining_balance integer not null
    );

    insert into public.billing_entitlement_periods (id, analysis_limit)
    values ('10000000-0000-4000-8000-000000000001', 24);
  `);
  await database.exec(await readMigration());
  return database;
}

async function seedAnalysis(
  database: PGlite,
  input: Readonly<{
    suffix: string;
    ownerId?: string;
    jobStatus: 'partial' | 'failed' | 'complete';
    reservationStatus: 'reserved' | 'settled' | 'released';
  }>,
) {
  const ownerId = input.ownerId ?? '20000000-0000-4000-8000-000000000001';
  const analysisId = `30000000-0000-4000-8000-${input.suffix}`;
  const jobId = `40000000-0000-4000-8000-${input.suffix}`;
  const reservationId = `50000000-0000-4000-8000-${input.suffix}`;
  const readyArtifactId = `60000000-0000-4000-8000-${input.suffix}`;
  const failedArtifactId = `70000000-0000-4000-8000-${input.suffix}`;

  await database.query(
    `insert into public.analysis_intakes (id, user_id) values ($1, $2)`,
    [analysisId, ownerId],
  );
  await database.query(
    `
      insert into public.analysis_jobs (
        id, analysis_id, user_id, status, stage, attempt, revision, error_code,
        completed_at
      ) values ($1, $2, $3, $4, 'artifacts', 1, 7, 'artifact_generation_failed', now())
    `,
    [jobId, analysisId, ownerId, input.jobStatus],
  );
  await database.query(
    `
      insert into public.analysis_usage_reservations (
        id, analysis_id, job_id, user_id, entitlement_period_id, status
      ) values (
        $1, $2, $3, $4, '10000000-0000-4000-8000-000000000001', $5
      )
    `,
    [reservationId, analysisId, jobId, ownerId, input.reservationStatus],
  );
  await database.query(
    `
      insert into public.analysis_artifacts (
        id, analysis_id, status, content, error_code, generated_at
      ) values
        ($1, $2, 'ready', '{"kept":true}', null, now()),
        ($3, $2, 'failed', null, 'provider_failed', null)
    `,
    [readyArtifactId, analysisId, failedArtifactId],
  );
  return { analysisId, jobId };
}

describe('DEN-118 settled partial retry migration', () => {
  it('keeps the public retry wrapper callable without exposing the billing helper', async () => {
    const database = await createDatabase();
    try {
      const privileges = await database.query<{
        public_retry: boolean;
        private_billing_helper: boolean;
      }>(`
        select
          has_function_privilege(
            'authenticated',
            'public.retry_analysis_pipeline(uuid)',
            'execute'
          ) as public_retry,
          has_function_privilege(
            'authenticated',
            'private.record_analysis_technical_retry(uuid, integer)',
            'execute'
          ) as private_billing_helper
      `);

      expect(privileges.rows).toEqual([
        { public_retry: true, private_billing_helper: false },
      ]);
    } finally {
      await database.close();
    }
  }, 20_000);

  it('retries only failed artifacts without consuming another reservation', async () => {
    const database = await createDatabase();
    try {
      const { analysisId, jobId } = await seedAnalysis(database, {
        suffix: '000000000001',
        jobStatus: 'partial',
        reservationStatus: 'settled',
      });
      await database.exec(
        `set request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001'`,
      );

      const retried = await database.query<{
        status: string;
        attempt: number;
        revision: number;
      }>(
        `select status, attempt, revision from public.retry_analysis_pipeline('${analysisId}')`,
      );

      expect(retried.rows).toEqual([
        { status: 'queued', attempt: 2, revision: 8 },
      ]);
      const reservation = await database.query<{ status: string }>(
        `select status from public.analysis_usage_reservations where job_id = '${jobId}'`,
      );
      expect(reservation.rows).toEqual([{ status: 'settled' }]);
      const reservations = await database.query<{ count: number }>(
        `select count(*)::integer as count from public.analysis_usage_reservations where analysis_id = '${analysisId}'`,
      );
      expect(reservations.rows).toEqual([{ count: 1 }]);
      const ledger = await database.query<{
        event_type: string;
        quantity: number;
        status: string;
        remaining_balance: number;
      }>(
        `select event_type, quantity, status, remaining_balance from public.usage_ledger where job_id = '${jobId}'`,
      );
      expect(ledger.rows).toEqual([
        {
          event_type: 'technical_retry',
          quantity: 0,
          status: 'informational',
          remaining_balance: 23,
        },
      ]);
      const artifacts = await database.query<{
        status: string;
        content: { kept: boolean } | null;
      }>(
        `select status, content from public.analysis_artifacts where analysis_id = '${analysisId}' order by status`,
      );
      expect(artifacts.rows).toEqual([
        { status: 'pending', content: null },
        { status: 'ready', content: { kept: true } },
      ]);

      await expect(
        database.exec(`select public.retry_analysis_pipeline('${analysisId}')`),
      ).rejects.toMatchObject({ code: 'P0001' });
      const unchangedAttempt = await database.query<{ attempt: number }>(
        `select attempt from public.analysis_jobs where id = '${jobId}'`,
      );
      expect(unchangedAttempt.rows).toEqual([{ attempt: 2 }]);
    } finally {
      await database.close();
    }
  }, 20_000);

  it.each(['partial', 'failed'] as const)(
    'preserves the existing %s + reserved retry contract',
    async (jobStatus) => {
      const database = await createDatabase();
      try {
        const { analysisId } = await seedAnalysis(database, {
          suffix: jobStatus === 'partial' ? '000000000005' : '000000000006',
          jobStatus,
          reservationStatus: 'reserved',
        });
        await database.exec(
          `set request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001'`,
        );

        const retried = await database.query<{
          status: string;
          attempt: number;
        }>(
          `select status, attempt from public.retry_analysis_pipeline('${analysisId}')`,
        );
        expect(retried.rows).toEqual([{ status: 'queued', attempt: 2 }]);
      } finally {
        await database.close();
      }
    },
    20_000,
  );

  it.each([
    ['complete', 'settled'],
    ['failed', 'released'],
  ] as const)(
    'rejects %s jobs with a %s reservation',
    async (jobStatus, reservationStatus) => {
      const database = await createDatabase();
      try {
        const { analysisId } = await seedAnalysis(database, {
          suffix: jobStatus === 'complete' ? '000000000002' : '000000000003',
          jobStatus,
          reservationStatus,
        });
        await database.exec(
          `set request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001'`,
        );

        await expect(
          database.exec(
            `select public.retry_analysis_pipeline('${analysisId}')`,
          ),
        ).rejects.toMatchObject({ code: 'P0001' });
      } finally {
        await database.close();
      }
    },
    20_000,
  );

  it('rejects a partial analysis owned by another user', async () => {
    const database = await createDatabase();
    try {
      const { analysisId } = await seedAnalysis(database, {
        suffix: '000000000004',
        ownerId: '20000000-0000-4000-8000-000000000002',
        jobStatus: 'partial',
        reservationStatus: 'settled',
      });
      await database.exec(
        `set request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001'`,
      );

      await expect(
        database.exec(`select public.retry_analysis_pipeline('${analysisId}')`),
      ).rejects.toMatchObject({ code: 'P0002' });
    } finally {
      await database.close();
    }
  }, 20_000);
});
