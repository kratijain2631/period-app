import { createGuidanceHandler } from '../handler';
import { generateGuidance } from '../generate';

jest.mock('../generate', () => ({ generateGuidance: jest.fn() }));
const generate = generateGuidance as jest.Mock;
const guidance = { dos: ['a', 'b', 'c'], donts: ['d', 'e', 'f'], friend_suggestions: [] };
const input = { userId: 'user-1', phase: 'luteal', phaseStart: '2026-11-01' };
const cached = { ...guidance, phase: input.phase, phase_started_at: input.phaseStart };
const client = {
  auth: { getUser: jest.fn() },
  rpc: jest.fn(), from: jest.fn(),
};
const createClient = jest.fn(() => client);
const handler = createGuidanceHandler(createClient as never, { apiKey: 'test-key', model: 'test-model' });
// The jsdom test environment has no Fetch Request/Response globals. The handler
// only needs these standard fields; Response is installed below for the test.
const request = (body: unknown = input, authorized = true) => ({
  method: 'POST', headers: { get: () => authorized ? 'Bearer user-token' : null },
  json: async () => body,
}) as unknown as Request;
const originalResponse = global.Response;
beforeAll(() => {
  global.Response = class {
    status: number;
    constructor(private body: string, options: { status?: number } = {}) { this.status = options.status ?? 200; }
    async json() { return JSON.parse(this.body); }
  } as unknown as typeof Response;
});
afterAll(() => { global.Response = originalResponse; });
beforeEach(() => {
  jest.clearAllMocks();
  client.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  client.rpc.mockImplementation(async (name: string) => ({
    data: name === 'claim_cycle_guidance' ? 'claim-1' : name === 'complete_cycle_guidance' ? true : [],
    error: null,
  }));
  client.from.mockReturnValue({ select: () => ({ maybeSingle: async () => ({ data: cached, error: null }) }) });
  generate.mockResolvedValue(guidance);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('rejects missing/invalid auth and mismatched accounts before claiming or spending', async () => {
  expect((await handler(request(input, false))).status).toBe(401);
  client.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Bad token' } });
  expect((await handler(request())).status).toBe(401);
  expect((await handler(request({ ...input, userId: 'victim' }))).status).toBe(403);
  expect(client.rpc).not.toHaveBeenCalled();
  expect(generate).not.toHaveBeenCalled();
});

it('rejects malformed phase requests before database work', async () => {
  expect((await handler(request({ ...input, phase: 'invalid' }))).status).toBe(400);
  expect((await handler(request(null))).status).toBe(400);
  expect(client.rpc).not.toHaveBeenCalled();
});

it('generates only after a claim and saves via the caller-scoped RPC', async () => {
  const response = await handler(request());
  expect(response.status).toBe(200);
  expect(createClient).toHaveBeenCalledWith('Bearer user-token');
  expect(client.rpc).toHaveBeenCalledWith('claim_cycle_guidance', { p_phase: input.phase, p_phase_start: input.phaseStart });
  expect(generate).toHaveBeenCalledWith('luteal', [], 'test-key', 'test-model');
  expect(client.rpc).toHaveBeenCalledWith('complete_cycle_guidance', {
    p_request_id: 'claim-1', p_dos: guidance.dos, p_donts: guidance.donts, p_friend_suggestions: [],
  });
  expect((await response.json()).guidance.phase_started_at).toBe(input.phaseStart);
  expect(client.from).not.toHaveBeenCalled();
});

it('returns cached guidance or pending without a second AI call when no lease is granted', async () => {
  client.rpc.mockResolvedValue({ data: null, error: null });
  expect((await handler(request())).status).toBe(200);
  client.from.mockReturnValue({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) });
  expect((await handler(request())).status).toBe(202);
  expect(generate).not.toHaveBeenCalled();
});

it('does not save fallback as AI guidance when generation fails', async () => {
  generate.mockRejectedValueOnce(new Error('AI unavailable'));
  expect((await handler(request())).status).toBe(503);
  expect(client.rpc.mock.calls.map(([name]) => name)).not.toContain('complete_cycle_guidance');
});

it('discards a result if the phase changed during generation', async () => {
  client.rpc.mockImplementation(async (name: string) => ({
    data: name === 'claim_cycle_guidance' ? 'claim-1' : name === 'complete_cycle_guidance' ? false : [], error: null,
  }));
  const response = await handler(request());
  expect(response.status).toBe(202);
  expect((await response.json()).guidance).toBeNull();
});

it('uses only sanitized friend phases and names, excluding self and unknown IDs', async () => {
  client.rpc.mockImplementation(async (name: string) => ({ data: {
    claim_cycle_guidance: 'claim-1', complete_cycle_guidance: true,
    friend_cycle_summaries: [
      { user_id: 'user-1', snapshot: { currentPhase: 'luteal' } },
      { user_id: 'friend-1', snapshot: { currentPhase: 'luteal', samples: ['private'] } },
    ],
    friend_profiles: [{ friend_id: 'friend-1', alias: 'Maya' }],
  }[name], error: null }));
  await handler(request());
  expect(generate).toHaveBeenCalledWith('luteal', [{ id: 'friend-1', name: 'Maya', phase: 'luteal' }], 'test-key', 'test-model');
  expect(client.from).not.toHaveBeenCalled();
});

it('uses the separate caller-scoped refresh claim and does not spend during cooldown', async () => {
  client.rpc.mockImplementation(async (name: string) => ({
    data: name === 'claim_cycle_guidance_refresh' ? null : [], error: null,
  }));
  const response = await handler(request({ ...input, refresh: true }));
  expect(client.rpc).toHaveBeenCalledWith('claim_cycle_guidance_refresh', { p_phase: input.phase, p_phase_start: input.phaseStart });
  expect((await response.json()).refreshLimited).toBe(true);
  expect(generate).not.toHaveBeenCalled();
});

it('rejects a non-boolean refresh flag before claiming', async () => {
  expect((await handler(request({ ...input, refresh: 'true' }))).status).toBe(400);
  expect(client.rpc).not.toHaveBeenCalled();
});
