import { createFakeHealthClient, isFakeHealthEnabled } from '../fakeHealthClient';

const NOW = new Date(2026, 10, 3, 12, 0, 0);
const LOOKBACK = { startDate: new Date(NOW.getTime() - 180 * 24 * 60 * 60 * 1000), endDate: NOW };

describe('isFakeHealthEnabled (release safety)', () => {
  it('is never on outside a dev build, even with the flag set', () => {
    expect(isFakeHealthEnabled(false, 'true')).toBe(false);
  });

  it('needs the exact flag value in a dev build', () => {
    expect(isFakeHealthEnabled(true, 'true')).toBe(true);
    expect(isFakeHealthEnabled(true, undefined)).toBe(false);
    expect(isFakeHealthEnabled(true, '1')).toBe(false);
    expect(isFakeHealthEnabled(true, 'false')).toBe(false);
  });
});

describe('createFakeHealthClient', () => {
  const clientFor = (email: string | null, personaOverride?: string) =>
    createFakeHealthClient({ getSignedInEmail: async () => email, personaOverride, now: () => NOW });

  it('reports Health as available and authorized', async () => {
    const client = clientFor('ava@personas.example.com');
    expect(client.isHealthDataAvailable()).toBe(true);
    await expect(client.requestAuthorization([], [])).resolves.toBe(true);
    expect(client.authorizationStatusFor('HKCategoryTypeIdentifierMenstrualFlow')).toBe(2);
  });

  it("returns the signed-in persona's flow samples, newest first and limited", async () => {
    const client = clientFor('ava@personas.example.com');
    const samples = (await client.queryCategorySamples('HKCategoryTypeIdentifierMenstrualFlow', {
      filter: LOOKBACK,
      limit: 3,
      ascending: false,
    })) as Array<{ startDate: Date }>;
    expect(samples).toHaveLength(3);
    expect(samples[0].startDate.getTime()).toBeGreaterThan(samples[1].startDate.getTime());
  });

  it('serves signal samples by HealthKit identifier', async () => {
    const client = clientFor('bea@personas.example.com');
    const ovulation = await client.queryCategorySamples('HKCategoryTypeIdentifierOvulationTestResult', {
      filter: LOOKBACK,
    });
    const temperature = await client.queryQuantitySamples('HKQuantityTypeIdentifierBasalBodyTemperature', {
      filter: LOOKBACK,
    });
    expect(ovulation.length).toBeGreaterThan(0);
    expect(temperature.length).toBeGreaterThan(0);
  });

  it('refuses to serve data to a real (non-persona) account, so a sync cannot blank its snapshot', async () => {
    const client = clientFor('real.person@gmail.com');
    await expect(
      client.queryCategorySamples('HKCategoryTypeIdentifierMenstrualFlow', { filter: LOOKBACK }),
    ).rejects.toThrow('not a test persona');
  });

  it('lets a persona override win over the signed-in email', async () => {
    const client = clientFor(null, 'cleo');
    const flow = await client.queryCategorySamples('HKCategoryTypeIdentifierMenstrualFlow', {
      filter: LOOKBACK,
    });
    expect(flow).toHaveLength(3);
  });
});
