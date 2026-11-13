/** Day labels from the published events already permitted in this feed. */
export const periodEventDays = (events: { id: string; user_id: string; event_type: string; starts_at: string }[]) => {
  const byUser = new Map<string, Map<number, string[]>>();
  events.filter(e => e.event_type === 'menstrual_flow').forEach(e => {
    const date = new Date(e.starts_at);
    if (!Number.isFinite(date.getTime())) return;
    // Calendar dates, rather than elapsed local milliseconds, keep DST days adjacent.
    const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
    const days = byUser.get(e.user_id) ?? new Map<number, string[]>();
    days.set(day, [...(days.get(day) ?? []), e.id]);
    byUser.set(e.user_id, days);
  });
  const labels: Record<string, { day: number; total: number }> = {};
  byUser.forEach(days => {
    let run: number[] = [];
    const flush = () => run.forEach((day, index) => days.get(day)!.forEach(id => { labels[id] = { day: index + 1, total: run.length }; }));
    [...days.keys()].sort((a, b) => a - b).forEach(day => {
      if (run.length && day - run[run.length - 1] > 1) { flush(); run = []; }
      run.push(day);
    });
    flush();
  });
  return labels;
};
