import type { Row } from '../engine';

// The victim is bea. ava is her friend, cleo has no relationship with her, and ava has a
// pending request to fay (pendingSender → pendingRecipient).
const rows: Row[] = [
  // friend_requests
  { name: 'a stranger cannot insert an already-accepted request', as: 'stranger', op: 'insert', table: 'friend_requests',
    row: { from_user_id: 'self', to_user_id: 'victim', status: 'accepted' }, expect: 'denied' },
  { name: 'a stranger can send a pending request', as: 'stranger', op: 'insert', table: 'friend_requests',
    row: { from_user_id: 'self', to_user_id: 'victim', status: 'pending' }, expect: 'allowed' },
  { name: 'a stranger cannot send a request in the victim\'s name', as: 'stranger', op: 'insert', table: 'friend_requests',
    row: { from_user_id: 'victim', to_user_id: 'self', status: 'pending' }, expect: 'denied' },
  { name: 'a recipient cannot change who sent a request', as: 'pendingRecipient', op: 'update', table: 'friend_requests',
    where: { from_user_id: 'pendingSender', to_user_id: 'pendingRecipient' }, set: { from_user_id: 'stranger' }, expect: 'hidden' },
  { name: 'a recipient can accept a request', as: 'pendingRecipient', op: 'update', table: 'friend_requests',
    where: { from_user_id: 'pendingSender', to_user_id: 'pendingRecipient' }, set: { status: 'accepted' }, expect: 'allowed' },
  { name: 'a sender cannot accept their own request', as: 'pendingSender', op: 'update', table: 'friend_requests',
    where: { from_user_id: 'pendingSender', to_user_id: 'pendingRecipient' }, set: { status: 'accepted' }, expect: 'hidden' },
  // bea's own requests to dev and eli don't involve ava, so ava mustn't see them.
  { name: 'a stranger cannot delete the victim\'s requests', as: 'stranger', op: 'delete', table: 'friend_requests',
    where: { from_user_id: 'victim' }, expect: 'hidden' },
  { name: 'a friend cannot see the victim\'s requests with other people', as: 'friend', op: 'select', table: 'friend_requests',
    owner: 'from_user_id', target: 'owner', expect: 'hidden' },
  { name: 'no login sees no requests', as: 'anon', op: 'select', table: 'friend_requests', owner: 'from_user_id', expect: 'hidden' },

  // friend_sharing (legacy, but it must still not be forgeable)
  { name: 'a stranger cannot write sharing in the victim\'s name', as: 'stranger', op: 'insert', table: 'friend_sharing',
    row: { user_id: 'victim', friend_id: 'self', has_shared: true }, expect: 'denied' },
  { name: 'a friend cannot change the victim\'s sharing', as: 'friend', op: 'update', table: 'friend_sharing',
    where: { user_id: 'victim', friend_id: 'friend' }, set: { has_shared: false }, expect: 'hidden' },
  { name: 'a stranger cannot read the victim\'s sharing', as: 'stranger', op: 'select', table: 'friend_sharing', owner: 'user_id', expect: 'hidden' },

  // posts
  { name: 'a friend sees the victim\'s posts', as: 'friend', op: 'select', table: 'posts', owner: 'user_id', expect: 'allowed' },
  { name: 'a stranger sees none of the victim\'s posts', as: 'stranger', op: 'select', table: 'posts', owner: 'user_id', expect: 'hidden' },
  { name: 'no login sees no posts', as: 'anon', op: 'select', table: 'posts', owner: 'user_id', expect: 'hidden' },
  { name: 'nobody can post as the victim', as: 'stranger', op: 'insert', table: 'posts',
    row: { user_id: 'victim', body: 'security matrix' }, expect: 'denied' },
  { name: 'a friend cannot edit the victim\'s post', as: 'friend', op: 'update', table: 'posts',
    where: { user_id: 'victim' }, set: { body: 'security matrix' }, expect: 'hidden' },
  { name: 'the owner cannot hand a post to someone else', as: 'owner', op: 'update', table: 'posts',
    where: { user_id: 'victim' }, set: { user_id: 'stranger' }, expect: 'hidden' },
  { name: 'a friend cannot delete the victim\'s post', as: 'friend', op: 'delete', table: 'posts',
    where: { user_id: 'victim' }, expect: 'hidden' },

  // post_reactions, event_reactions, boops
  { name: 'a friend can react to the victim\'s post', as: 'friend', op: 'insert', table: 'post_reactions',
    row: { post_id: { rowOf: 'posts' }, user_id: 'self', emoji: '🧪' }, expect: 'allowed' },
  { name: 'a stranger cannot react to the victim\'s post', as: 'stranger', op: 'insert', table: 'post_reactions',
    row: { post_id: { rowOf: 'posts' }, user_id: 'self', emoji: '🧪' }, expect: 'denied' },
  { name: 'a friend can react to the victim\'s cycle event', as: 'friend', op: 'insert', table: 'event_reactions',
    row: { event_id: { rowOf: 'cycle_events' }, user_id: 'self', emoji: '🧪' }, expect: 'allowed' },
  { name: 'a stranger cannot react to the victim\'s cycle event', as: 'stranger', op: 'insert', table: 'event_reactions',
    row: { event_id: { rowOf: 'cycle_events' }, user_id: 'self', emoji: '🧪' }, expect: 'denied' },
  { name: 'a friend can boop the victim', as: 'friend', op: 'insert', table: 'boops',
    row: { from_user_id: 'self', to_user_id: 'victim' }, expect: 'allowed' },
  { name: 'a stranger cannot boop the victim', as: 'stranger', op: 'insert', table: 'boops',
    row: { from_user_id: 'self', to_user_id: 'victim' }, expect: 'denied' },
  { name: 'nobody can boop in the victim\'s name', as: 'stranger', op: 'insert', table: 'boops',
    row: { from_user_id: 'victim', to_user_id: 'self' }, expect: 'denied' },

  // cycle data: raw tables are owner-only; friends read through the functions
  { name: 'the owner sees their own snapshot', as: 'owner', op: 'select', table: 'cycle_snapshots', owner: 'user_id', expect: 'allowed' },
  { name: 'a friend cannot read the raw snapshot', as: 'friend', op: 'select', table: 'cycle_snapshots', owner: 'user_id', expect: 'hidden' },
  { name: 'a stranger cannot read the raw snapshot', as: 'stranger', op: 'select', table: 'cycle_snapshots', owner: 'user_id', expect: 'hidden' },
  { name: 'the owner cannot move their snapshot to someone else', as: 'owner', op: 'update', table: 'cycle_snapshots',
    where: { user_id: 'victim' }, set: { user_id: 'stranger' }, expect: 'hidden' },
  { name: 'a friend cannot read raw cycle events', as: 'friend', op: 'select', table: 'cycle_events', owner: 'user_id', expect: 'hidden' },
  { name: 'a stranger cannot read raw cycle events', as: 'stranger', op: 'select', table: 'cycle_events', owner: 'user_id', expect: 'hidden' },
  { name: 'a friend sees the victim in cycle summaries', as: 'friend', op: 'rpc', fn: 'friend_cycle_summaries', field: 'user_id', expect: 'allowed' },
  { name: 'a stranger doesn\'t see the victim in cycle summaries', as: 'stranger', op: 'rpc', fn: 'friend_cycle_summaries', field: 'user_id', expect: 'hidden' },
  { name: 'no login cannot call cycle summaries', as: 'anon', op: 'rpc', fn: 'friend_cycle_summaries', expect: 'denied' },
  { name: 'a friend sees the victim\'s shared cycle events', as: 'friend', op: 'rpc', fn: 'shared_cycle_events', args: { max_rows: 200 }, field: 'user_id', expect: 'allowed' },
  { name: 'a stranger sees none of the victim\'s shared cycle events', as: 'stranger', op: 'rpc', fn: 'shared_cycle_events', args: { max_rows: 200 }, field: 'user_id', expect: 'hidden' },

  { name: 'a stranger cannot see private post comments', as: 'stranger', op: 'select', table: 'post_comments', owner:'user_id', expect:'hidden' },
  { name: 'a friend can comment on a visible post', as:'friend', op:'insert',table:'post_comments',row:{post_id:{rowOf:'posts'},body:'Matrix friend comment'},expect:'allowed' },
  { name: 'a stranger cannot comment on a private post', as:'stranger',op:'insert',table:'post_comments',row:{post_id:{rowOf:'posts'},body:'Matrix denied comment'},expect:'denied' },
  { name: 'a friend cannot remove another author’s comment', as:'friend',op:'delete',table:'post_comments',setup:{post_id:{rowOf:'posts'},user_id:'victim',body:'Matrix protected comment'},where:{body:'Matrix protected comment'},expect:'hidden' },

  { name: 'a stranger cannot read private cycle update comments', as: 'stranger', op: 'select', table: 'event_comments', owner: 'user_id', expect: 'hidden' },
  { name: 'a friend can comment on a shared cycle update', as: 'friend', op: 'insert', table: 'event_comments',
    row: { event_id: { rowOf: 'cycle_events' }, body: 'Shared cycle reply' }, expect: 'allowed' },
  { name: 'a stranger cannot comment on a private cycle update', as: 'stranger', op: 'insert', table: 'event_comments',
    row: { event_id: { rowOf: 'cycle_events' }, body: 'Private cycle reply' }, expect: 'denied' },
  { name: 'a friend cannot delete another author’s cycle update comment', as: 'friend', op: 'delete', table: 'event_comments',
    setup: { event_id: { rowOf: 'cycle_events' }, user_id: 'victim', body: 'Protected cycle reply' },
    where: { body: 'Protected cycle reply' }, expect: 'hidden' },

  // profiles and search
  { name: 'a friend can read the victim\'s name', as: 'friend', op: 'rpc', fn: 'friend_profiles', args: { friend_ids: ['victim'] }, field: 'friend_id', expect: 'allowed' },
  { name: 'a stranger cannot read the victim\'s name', as: 'stranger', op: 'rpc', fn: 'friend_profiles', args: { friend_ids: ['victim'] }, field: 'friend_id', expect: 'hidden' },
  { name: 'a friend cannot read the victim\'s users row', as: 'friend', op: 'select', table: 'users', owner: 'id', expect: 'hidden' },
  { name: 'no login cannot search users', as: 'anon', op: 'rpc', fn: 'search_users', args: { search: 'Be' }, expect: 'denied' },
  { name: '"%" as a search term lists nobody', as: 'stranger', op: 'rpc', fn: 'search_users', args: { search: '%%', max_results: null }, field: 'id', expect: 'hidden' },

  // server-only functions
  { name: 'a signed-in user cannot list due reminders', as: 'friend', op: 'rpc', fn: 'due_phase_reminders', expect: 'denied' },
  { name: 'a signed-in user cannot mark someone reminded', as: 'friend', op: 'rpc', fn: 'mark_phase_reminded',
    args: { target_user: 'victim', phase_start: '2026-01-01T00:00:00Z' }, expect: 'denied' },
];

export default rows;
