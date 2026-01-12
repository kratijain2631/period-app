// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

type CycleSample = {
  startDate: string;
  endDate: string;
  flowValue?: number | null;
};

type CycleSnapshot = {
  currentPhase?: string | null;
  latestSampleStart?: string | null;
  samples?: CycleSample[] | null;
};

type Pair = {
  userId: string;
  friendId: string;
};

type RecommendationRow = {
  user_id: string;
  friend_id: string;
  generated_at: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const REGEN_DAYS = 3;
const PHASE_ORDER = ['menstruation', 'follicular', 'ovulation', 'luteal', 'pms'];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const phaseDistance = (a?: string | null, b?: string | null) => {
  if (!a || !b || a === 'unknown' || b === 'unknown') {
    return null;
  }
  const aIndex = PHASE_ORDER.indexOf(a);
  const bIndex = PHASE_ORDER.indexOf(b);
  if (aIndex < 0 || bIndex < 0) {
    return null;
  }
  const diff = Math.abs(aIndex - bIndex);
  return Math.min(diff, PHASE_ORDER.length - diff);
};

const scorePhaseAlignment = (a?: string | null, b?: string | null) => {
  const distance = phaseDistance(a, b);
  if (distance === null) {
    return 0.45;
  }
  const maxDistance = Math.floor(PHASE_ORDER.length / 2);
  return clamp(1 - distance / maxDistance, 0, 1);
};

const latestSampleDate = (snapshot: CycleSnapshot) => {
  if (snapshot.latestSampleStart) {
    return new Date(snapshot.latestSampleStart);
  }
  const samples = snapshot.samples ?? [];
  const latest = [...samples].sort(
    (left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime(),
  )[0];
  return latest ? new Date(latest.startDate) : null;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const collectFlowDates = (samples: CycleSample[], now: Date, windowDays = 28): Set<string> => {
  const cutoff = new Date(now.getTime() - windowDays * DAY_MS);
  const dates = new Set<string>();
  samples.forEach((sample) => {
    const value = sample.flowValue ?? 1;
    if (typeof value === 'number' && value <= 0) {
      return;
    }
    const start = new Date(sample.startDate);
    const end = new Date(sample.endDate);
    if (end < cutoff) {
      return;
    }
    const cursor = new Date(Math.max(start.getTime(), cutoff.getTime()));
    while (cursor <= end) {
      dates.add(toDateKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  });
  return dates;
};

const computeScore = (self: CycleSnapshot, friend: CycleSnapshot, now = new Date()) => {
  const selfPhase = self.currentPhase ?? 'unknown';
  const friendPhase = friend.currentPhase ?? 'unknown';
  const phaseAlignment = scorePhaseAlignment(selfPhase, friendPhase);

  const selfLatest = latestSampleDate(self);
  const friendLatest = latestSampleDate(friend);
  const daysApart =
    selfLatest && friendLatest
      ? Math.abs(Math.round((selfLatest.getTime() - friendLatest.getTime()) / DAY_MS))
      : null;
  const flowTiming = daysApart === null ? 0.5 : clamp(1 - daysApart / 14, 0, 1);

  const selfDates = collectFlowDates(self.samples ?? [], now);
  const friendDates = collectFlowDates(friend.samples ?? [], now);
  const overlapDays = [...selfDates].filter((date) => friendDates.has(date)).length;
  const unionDays = new Set([...selfDates, ...friendDates]).size;
  const overlapRatio = unionDays === 0 ? 0.5 : clamp(overlapDays / unionDays, 0, 1);

  const rawScore = 0.45 * phaseAlignment + 0.35 * flowTiming + 0.2 * overlapRatio;
  const score = Math.round(clamp(rawScore, 0, 1) * 100);

  return {
    score,
    selfPhase,
    friendPhase,
    daysApart,
    overlapDays,
  };
};

const fallbackRecommendations = (summary: ReturnType<typeof computeScore>) => {
  const recs: string[] = [];
  if (summary.selfPhase === summary.friendPhase && summary.selfPhase !== 'unknown') {
    recs.push(`Plan around your shared ${summary.selfPhase} window.`);
  } else {
    recs.push('Keep plans flexible for each other today.');
  }

  if (summary.friendPhase === 'menstruation' || summary.friendPhase === 'pms') {
    recs.push('Send a gentle check-in and offer extra warmth.');
  } else if (summary.friendPhase === 'ovulation') {
    recs.push('Share a playful or celebratory note.');
  } else {
    recs.push('Offer a low-key hang or quick voice note.');
  }

  if (summary.score >= 80) {
    recs.push('Lean into this high-sync week for plans.');
  } else if (summary.score <= 50) {
    recs.push('Focus on small, supportive touches.');
  } else {
    recs.push('Sync on one small plan together.');
  }

  return recs.slice(0, 3);
};

const generateRecommendations = async (summary: ReturnType<typeof computeScore>) => {
  if (!openaiKey) {
    return fallbackRecommendations(summary);
  }

  const prompt = [
    'You are generating short, friendly recommendations for two friends.',
    'Avoid medical advice and keep suggestions supportive and actionable.',
    'Return ONLY a JSON array of 3 short strings (max 8 words each).',
    '',
    `Self phase: ${summary.selfPhase}.`,
    `Friend phase: ${summary.friendPhase}.`,
    `Latest flow gap: ${summary.daysApart ?? 'unknown'} days.`,
    `Shared flow days (28d): ${summary.overlapDays}.`,
    `Sync score: ${summary.score}.`,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      messages: [
        { role: 'system', content: 'You output JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[friend-recommendations] OpenAI error', response.status, text);
    return fallbackRecommendations(summary);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? '[]';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean).slice(0, 3);
    }
  } catch (error) {
    console.warn('[friend-recommendations] Failed to parse OpenAI JSON', error);
  }

  return fallbackRecommendations(summary);
};

const collectMutualPairs = async (): Promise<Pair[]> => {
  const { data, error } = await supabase
    .from('friend_sharing')
    .select('user_id, friend_id')
    .eq('has_shared', true);

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const map = new Map<string, Set<string>>();
  rows.forEach((row) => {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, new Set());
    }
    map.get(row.user_id)?.add(row.friend_id);
  });

  const pairs: Pair[] = [];
  const seen = new Set<string>();
  rows.forEach((row) => {
    const reciprocal = map.get(row.friend_id);
    if (reciprocal?.has(row.user_id)) {
      const key = `${row.user_id}:${row.friend_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ userId: row.user_id, friendId: row.friend_id });
      }
    }
  });

  return pairs;
};

const loadExistingMap = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return new Map<string, RecommendationRow>();
  }
  const { data, error } = await supabase
    .from('friend_recommendations')
    .select('user_id, friend_id, generated_at')
    .in('user_id', userIds);

  if (error) {
    throw error;
  }

  const map = new Map<string, RecommendationRow>();
  (data ?? []).forEach((row) => {
    map.set(`${row.user_id}:${row.friend_id}`, row as RecommendationRow);
  });
  return map;
};

const isFresh = (row: RecommendationRow | undefined) => {
  if (!row) {
    return false;
  }
  const updatedAt = new Date(row.generated_at).getTime();
  return Date.now() - updatedAt < REGEN_DAYS * DAY_MS;
};

Deno.serve(async () => {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), { status: 500 });
    }

    const pairs = await collectMutualPairs();
    const existingMap = await loadExistingMap(Array.from(new Set(pairs.map((pair) => pair.userId))));

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const pair of pairs) {
      const existing = existingMap.get(`${pair.userId}:${pair.friendId}`);
      if (isFresh(existing)) {
        skipped += 1;
        continue;
      }

      const { data: snapshots, error: snapshotError } = await supabase
        .from('cycle_snapshots')
        .select('user_id, snapshot')
        .in('user_id', [pair.userId, pair.friendId]);

      if (snapshotError) {
        errors.push(snapshotError.message);
        continue;
      }

      const snapshotMap = new Map<string, CycleSnapshot>();
      (snapshots ?? []).forEach((row) => snapshotMap.set(row.user_id, row.snapshot as CycleSnapshot));
      const selfSnapshot = snapshotMap.get(pair.userId);
      const friendSnapshot = snapshotMap.get(pair.friendId);
      if (!selfSnapshot || !friendSnapshot) {
        skipped += 1;
        continue;
      }

      const summary = computeScore(selfSnapshot, friendSnapshot);
      const recommendations = await generateRecommendations(summary);

      const { error: upsertError } = await supabase
        .from('friend_recommendations')
        .upsert(
          {
            user_id: pair.userId,
            friend_id: pair.friendId,
            recommendations,
            score: summary.score,
            generated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,friend_id' },
        );

      if (upsertError) {
        errors.push(upsertError.message);
        continue;
      }

      processed += 1;
    }

    return new Response(JSON.stringify({ processed, skipped, errors }), {
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), { status: 500 });
  }
});
