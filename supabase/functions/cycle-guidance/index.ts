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

type ProfileRow = {
  id: string;
  full_name?: string | null;
  alias?: string | null;
  email?: string | null;
};

type FriendContext = {
  id: string;
  name: string;
  phase: string;
  lastSyncedAt?: string | null;
};

type GuidanceRow = {
  user_id: string;
  phase?: string | null;
  dos: string[];
  donts: string[];
  friend_suggestions: Array<{
    friend_id: string;
    friend_name?: string | null;
    suggestion: string;
  }>;
  generated_at: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const PHASE_ORDER = ['menstruation', 'follicular', 'ovulation', 'luteal', 'pms'];

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

const fallbackPhaseGuidance: Record<string, { dos: string[]; donts: string[] }> = {
  menstruation: {
    dos: ['Keep plans light', 'Choose comfort moves', 'Stay gently hydrated'],
    donts: ['Overbook the day', 'Skip meals', 'Ignore rest cues'],
  },
  follicular: {
    dos: ['Start fresh plans', 'Tackle focus tasks', 'Ease into workouts'],
    donts: ['Overcommit early', 'Skip warmups', 'Ignore sleep'],
  },
  ovulation: {
    dos: ['Plan social time', 'Share big ideas', 'Try something fun'],
    donts: ['Overbook evenings', 'Skip breaks', 'Push too late'],
  },
  luteal: {
    dos: ['Prioritize focus blocks', 'Keep meals steady', 'Choose calmer plans'],
    donts: ['Stack too many meetings', 'Skip downtime', 'Go all-out late'],
  },
  pms: {
    dos: ['Slow the pace', 'Ask for support', 'Pick cozy plans'],
    donts: ['Overcommit to big plans', 'Skip self-care', 'Ignore rest needs'],
  },
  unknown: {
    dos: ['Check in with yourself', 'Keep plans flexible', 'Stay gently hydrated'],
    donts: ['Overpack the day', 'Skip breaks', 'Ignore rest cues'],
  },
};

const fallbackFriendSuggestion = (phase: string, name: string) => {
  switch (phase) {
    case 'menstruation':
      return `Send ${name} a gentle check-in.`;
    case 'follicular':
      return `Plan a light hang with ${name}.`;
    case 'ovulation':
      return `Do something social with ${name}.`;
    case 'luteal':
      return `Keep it low-key with ${name}.`;
    case 'pms':
      return `Offer ${name} a cozy plan.`;
    default:
      return `Reach out to ${name} today.`;
  }
};

const resolveDisplayName = (profile: ProfileRow | undefined) => {
  if (!profile) {
    return 'Friend';
  }
  return profile.alias || profile.full_name || profile.email || 'Friend';
};

const extractJsonObject = (content: string) => {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return candidate.slice(start, end + 1);
  }
  return candidate;
};

const generateGuidance = async (phase: string, friends: FriendContext[]) => {
  const fallback =
    fallbackPhaseGuidance[phase] ?? fallbackPhaseGuidance.unknown;
  const fallbackFriends = friends.map((friend) => ({
    friend_id: friend.id,
    friend_name: friend.name,
    suggestion: fallbackFriendSuggestion(phase, friend.name),
  }));

  if (!openaiKey) {
    return {
      dos: fallback.dos,
      donts: fallback.donts,
      friend_suggestions: fallbackFriends,
    };
  }

  const friendContext = friends.length
    ? friends
        .map(
          (friend) =>
            `- id: ${friend.id}, name: ${friend.name}, phase: ${friend.phase}`,
        )
        .join('\n')
    : 'None';

  const prompt = [
    'You generate short, friendly cycle guidance.',
    'Avoid medical advice, diagnosis, or prescriptions.',
    'Return ONLY JSON with keys: dos, donts, friendSuggestions.',
    'dos and donts must be arrays of 3 short strings (max 8 words).',
    'friendSuggestions must be an array of objects { friendId, suggestion }.',
    'Use friendId values EXACTLY as provided; do not invent new friends.',
    'If no friends are provided, return friendSuggestions as an empty array.',
    '',
    `Phase: ${phase}.`,
    'Friends:',
    friendContext,
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
    console.error('[cycle-guidance] OpenAI error', response.status, text);
    return {
      dos: fallback.dos,
      donts: fallback.donts,
      friend_suggestions: fallbackFriends,
    };
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(extractJsonObject(content));
    const dos = Array.isArray(parsed?.dos)
      ? parsed.dos.map((item: any) => String(item)).filter(Boolean).slice(0, 3)
      : fallback.dos;
    const donts = Array.isArray(parsed?.donts)
      ? parsed.donts.map((item: any) => String(item)).filter(Boolean).slice(0, 3)
      : fallback.donts;
    const allowedIds = new Set(friends.map((friend) => friend.id));
    const parsedFriends = Array.isArray(parsed?.friendSuggestions)
      ? parsed.friendSuggestions
          .map((item: any) => {
            const friendId = item?.friendId ? String(item.friendId) : '';
            if (!friendId || !allowedIds.has(friendId)) {
              return null;
            }
            const suggestion = item?.suggestion ? String(item.suggestion) : '';
            if (!suggestion) {
              return null;
            }
            const friend = friends.find((entry) => entry.id === friendId);
            return {
              friend_id: friendId,
              friend_name: friend?.name ?? 'Friend',
              suggestion,
            };
          })
          .filter(Boolean)
      : [];

    return {
      dos,
      donts,
      friend_suggestions:
        parsedFriends.length > 0 ? (parsedFriends as GuidanceRow['friend_suggestions']) : fallbackFriends,
    };
  } catch (error) {
    console.warn('[cycle-guidance] Failed to parse OpenAI JSON', error);
  }

  return {
    dos: fallback.dos,
    donts: fallback.donts,
    friend_suggestions: fallbackFriends,
  };
};

const collectMutualFriendMap = async (): Promise<Map<string, Set<string>>> => {
  const { data, error } = await supabase
    .from('friend_sharing')
    .select('user_id, friend_id')
    .eq('has_shared', true);

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const forward = new Map<string, Set<string>>();
  rows.forEach((row) => {
    if (!forward.has(row.user_id)) {
      forward.set(row.user_id, new Set());
    }
    forward.get(row.user_id)?.add(row.friend_id);
  });

  const mutual = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const reciprocal = forward.get(row.friend_id);
    if (reciprocal?.has(row.user_id)) {
      if (!mutual.has(row.user_id)) {
        mutual.set(row.user_id, new Set());
      }
      if (!mutual.has(row.friend_id)) {
        mutual.set(row.friend_id, new Set());
      }
      mutual.get(row.user_id)?.add(row.friend_id);
      mutual.get(row.friend_id)?.add(row.user_id);
    }
  });

  return mutual;
};

const buildSimilarFriends = (selfPhase: string, friends: FriendContext[]) => {
  if (!selfPhase || selfPhase === 'unknown' || friends.length === 0) {
    return [];
  }
  const filtered = friends.filter((friend) => friend.phase && friend.phase !== 'unknown');
  if (filtered.length === 0) {
    return [];
  }
  const sorted = [...filtered].sort((left, right) => {
    const leftDistance = phaseDistance(selfPhase, left.phase) ?? 9;
    const rightDistance = phaseDistance(selfPhase, right.phase) ?? 9;
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    const leftTime = left.lastSyncedAt ? new Date(left.lastSyncedAt).getTime() : 0;
    const rightTime = right.lastSyncedAt ? new Date(right.lastSyncedAt).getTime() : 0;
    return rightTime - leftTime;
  });
  return sorted.slice(0, 3);
};

Deno.serve(async () => {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), { status: 500 });
    }

    const { data: snapshots, error: snapshotError } = await supabase
      .from('cycle_snapshots')
      .select('user_id, snapshot, last_synced_at');

    if (snapshotError) {
      throw snapshotError;
    }

    const snapshotMap = new Map<string, { snapshot: CycleSnapshot; last_synced_at: string }>();
    (snapshots ?? []).forEach((row) => {
      snapshotMap.set(row.user_id, {
        snapshot: row.snapshot as CycleSnapshot,
        last_synced_at: row.last_synced_at as string,
      });
    });

    const userIds = Array.from(snapshotMap.keys());
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ processed: 0, skipped: 0, errors: [] }), {
        status: 200,
      });
    }
    const friendMap = await collectMutualFriendMap();

    const { data: profiles, error: profileError } = await supabase
      .from('users')
      .select('id, full_name, alias, email')
      .in('id', userIds);

    if (profileError) {
      throw profileError;
    }

    const profileMap = new Map<string, ProfileRow>();
    (profiles ?? []).forEach((row) => {
      profileMap.set(row.id, row as ProfileRow);
    });

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      const snapshotEntry = snapshotMap.get(userId);
      if (!snapshotEntry) {
        skipped += 1;
        continue;
      }
      const selfPhase = snapshotEntry.snapshot.currentPhase ?? 'unknown';

      const friendIds = Array.from(friendMap.get(userId) ?? []);
      const friendContexts: FriendContext[] = friendIds
        .map((friendId) => {
          const friendSnapshotEntry = snapshotMap.get(friendId);
          if (!friendSnapshotEntry) {
            return null;
          }
          const profile = profileMap.get(friendId);
          return {
            id: friendId,
            name: resolveDisplayName(profile),
            phase: friendSnapshotEntry.snapshot.currentPhase ?? 'unknown',
            lastSyncedAt: friendSnapshotEntry.last_synced_at,
          };
        })
        .filter(Boolean) as FriendContext[];

      const similarFriends = buildSimilarFriends(selfPhase, friendContexts);
      const guidance = await generateGuidance(selfPhase, similarFriends);

      const { error: upsertError } = await supabase
        .from('cycle_guidance')
        .upsert(
          {
            user_id: userId,
            phase: selfPhase,
            dos: guidance.dos,
            donts: guidance.donts,
            friend_suggestions: guidance.friend_suggestions,
            generated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
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
