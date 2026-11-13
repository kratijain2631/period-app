import { createHash } from 'crypto';
import type { Row } from '../engine';

// What a phone would send for bea's email: a SHA-256 of the normalised address.
const victimEmailHash = createHash('sha256').update('bea@personas.example.com').digest('hex');

// Account data, notifications, guidance and the remaining functions. The victim is bea; ava is
// her friend and cleo a stranger (see engine.ts).
const rows: Row[] = [
  { name: 'no login cannot read the community boards', as: 'anon', op: 'rpc', fn: 'circle_community_top', args: { board: 'friends' }, expect: 'denied' },
  { name: 'no login cannot read a personal support ranking', as: 'anon', op: 'rpc', fn: 'my_circle_support', expect: 'denied' },
  { name: 'no login cannot read an outward profile', as: 'anon', op: 'rpc', fn: 'circle_member_profile', args: { subject: 'victim' }, expect: 'denied' },
  { name: 'no login cannot search the member directory', as: 'anon', op: 'rpc', fn: 'circle_search_members', args: { term: 'be' }, expect: 'denied' },
  // users: own row only; the email always matches the login email
  { name: 'nobody can create a profile for someone else', as: 'stranger', op: 'insert', table: 'users',
    row: { id: 'victim', email: 'security-matrix@personas.example.com' }, expect: 'denied' },
  { name: 'a stranger cannot edit the victim\'s profile', as: 'stranger', op: 'update', table: 'users',
    where: { id: 'victim' }, set: { alias: 'security-matrix' }, expect: 'hidden' },
  { name: 'a friend cannot edit the victim\'s profile', as: 'friend', op: 'update', table: 'users',
    where: { id: 'victim' }, set: { bio: 'security matrix' }, expect: 'hidden' },
  { name: 'the owner cannot put someone else\'s email on their profile', as: 'owner', op: 'update', table: 'users',
    where: { id: 'victim' }, set: { email: 'cleo@personas.example.com' }, expect: 'hidden' },
  { name: 'nobody can delete someone else\'s profile', as: 'stranger', op: 'delete', table: 'users',
    where: { id: 'victim' }, expect: 'hidden' },

  // device_tokens: push tokens are private to their owner
  { name: 'nobody can register a push token for someone else', as: 'stranger', op: 'insert', table: 'device_tokens',
    row: { user_id: 'victim', token: 'ExponentPushToken[security-matrix]', platform: 'ios' }, expect: 'denied' },
  { name: 'a friend cannot read the victim\'s push tokens', as: 'friend', op: 'select', table: 'device_tokens', owner: 'user_id', expect: 'hidden' },

  { name: 'a friend cannot change the victim\'s push token', as: 'friend', op: 'update', table: 'device_tokens',
    setup: { user_id: 'victim', token: 'ExponentPushToken[security-matrix]', platform: 'ios' },
    where: { user_id: 'victim', token: 'ExponentPushToken[security-matrix]' }, set: { token: 'ExponentPushToken[hijacked]' }, expect: 'hidden' },
  { name: 'a friend cannot delete the victim\'s push token', as: 'friend', op: 'delete', table: 'device_tokens',
    setup: { user_id: 'victim', token: 'ExponentPushToken[security-matrix]', platform: 'ios' },
    where: { user_id: 'victim', token: 'ExponentPushToken[security-matrix]' }, expect: 'hidden' },

  // notifications: created by the server, read and updated by their owner
  { name: 'the owner sees their notifications', as: 'owner', op: 'select', table: 'notifications', owner: 'user_id', expect: 'allowed' },
  { name: 'a friend cannot read the victim\'s notifications', as: 'friend', op: 'select', table: 'notifications', owner: 'user_id', expect: 'hidden' },
  { name: 'nobody can send the victim a notification directly', as: 'friend', op: 'insert', table: 'notifications',
    row: { user_id: 'victim', friend_id: 'self', payload: { type: 'security-matrix' } }, expect: 'denied' },
  { name: 'a friend cannot mark the victim\'s notification read', as: 'friend', op: 'update', table: 'notifications',
    where: { user_id: 'victim' }, set: { read_at: '2026-01-01T00:00:00Z' }, expect: 'hidden' },
  { name: 'the owner cannot move a notification to someone else', as: 'owner', op: 'update', table: 'notifications',
    where: { user_id: 'victim' }, set: { user_id: 'stranger' }, expect: 'hidden' },

  // guidance and recommendations: written by the server only
  { name: 'nobody can write the victim\'s guidance', as: 'friend', op: 'insert', table: 'cycle_guidance',
    row: { user_id: 'victim', phase: 'follicular', dos: [], donts: [], friend_suggestions: [] }, expect: 'denied' },
  { name: 'the owner cannot write their own guidance directly', as: 'owner', op: 'insert', table: 'cycle_guidance',
    row: { user_id: 'self', phase: 'follicular', dos: [], donts: [], friend_suggestions: [] }, expect: 'denied' },
  { name: 'the owner cannot rewrite their own guidance', as: 'owner', op: 'update', table: 'cycle_guidance',
    setup: { user_id: 'victim', phase: 'follicular', dos: ['a'], donts: ['b'], friend_suggestions: [] },
    where: { user_id: 'victim' }, set: { dos: ['security matrix'] }, expect: 'hidden' },
  { name: 'the owner cannot rewrite their own recommendations', as: 'owner', op: 'update', table: 'friend_recommendations',
    setup: { user_id: 'victim', friend_id: 'friend', recommendations: ['a'] },
    where: { user_id: 'victim', friend_id: 'friend' }, set: { recommendations: ['security matrix'] }, expect: 'hidden' },
  { name: 'a friend cannot read the victim\'s guidance', as: 'friend', op: 'select', table: 'cycle_guidance', owner: 'user_id', expect: 'hidden' },
  { name: 'nobody can write recommendations', as: 'owner', op: 'insert', table: 'friend_recommendations',
    row: { user_id: 'self', friend_id: 'friend', recommendations: [] }, expect: 'denied' },
  { name: 'a friend cannot read the victim\'s recommendations', as: 'friend', op: 'select', table: 'friend_recommendations', owner: 'user_id', expect: 'hidden' },
  { name: 'guidance requests are server-only', as: 'owner', op: 'select', table: 'cycle_guidance_requests', owner: 'user_id', expect: 'hidden' },

  // raw cycle tables: nobody writes another person's data
  { name: 'nobody can write a snapshot for someone else', as: 'stranger', op: 'insert', table: 'cycle_snapshots',
    row: { user_id: 'victim', snapshot: {} }, expect: 'denied' },
  { name: 'nobody can add cycle events for someone else', as: 'stranger', op: 'insert', table: 'cycle_events',
    row: { user_id: 'victim', event_type: 'period_start', starts_at: '2026-01-01T00:00:00Z' }, expect: 'denied' },
  { name: 'a friend cannot edit the victim\'s cycle events', as: 'friend', op: 'update', table: 'cycle_events',
    where: { user_id: 'victim' }, set: { phase: 'luteal' }, expect: 'hidden' },
  { name: 'a friend cannot delete the victim\'s cycle events', as: 'friend', op: 'delete', table: 'cycle_events',
    where: { user_id: 'victim' }, expect: 'hidden' },

  // reactions: only your own can be removed
  { name: 'a friend cannot remove the victim\'s reaction', as: 'friend', op: 'delete', table: 'post_reactions',
    where: { user_id: 'victim' }, expect: 'hidden' },
  { name: 'a stranger cannot see the victim\'s reactions', as: 'stranger', op: 'select', table: 'post_reactions', owner: 'user_id', expect: 'hidden' },

  { name: 'a friend cannot remove the victim\'s cycle-event reaction', as: 'friend', op: 'delete', table: 'event_reactions',
    setup: { event_id: { rowOf: 'cycle_events' }, user_id: 'victim', emoji: '🧪' },
    where: { user_id: 'victim', emoji: '🧪' }, expect: 'hidden' },
  { name: 'a stranger cannot see reactions on the victim\'s cycle events', as: 'stranger', op: 'select', table: 'event_reactions', owner: 'user_id', target: 'friend', expect: 'hidden' },
  { name: 'a stranger cannot see the victim\'s boops', as: 'stranger', op: 'select', table: 'boops', owner: 'to_user_id', expect: 'hidden' },

  // remaining functions
  { name: 'a stranger cannot read names on the victim\'s requests', as: 'stranger', op: 'rpc', fn: 'friend_request_profiles',
    args: { request_ids: [{ rowOf: 'friend_requests' }] }, field: 'other_user_id', expect: 'hidden' },
  { name: 'no login cannot claim guidance', as: 'anon', op: 'rpc', fn: 'claim_cycle_guidance',
    args: { p_phase: 'follicular', p_phase_start: null }, expect: 'denied' },
  { name: 'no login cannot request a guidance refresh', as: 'anon', op: 'rpc', fn: 'claim_cycle_guidance_refresh', expect: 'denied' },
  { name: 'no login cannot save guidance', as: 'anon', op: 'rpc', fn: 'complete_cycle_guidance',
    args: { p_request_id: '00000000-0000-0000-0000-000000000000', p_dos: [], p_donts: [], p_friend_suggestions: [] }, expect: 'denied' },
  { name: 'no login cannot delete an account', as: 'anon', op: 'rpc', fn: 'delete_account', expect: 'denied' },
  { name: 'no login cannot match contacts', as: 'anon', op: 'rpc', fn: 'contact_friend_matches',
    args: { email_hashes: [], max_results: 1 }, expect: 'denied' },
  { name: 'no login cannot match contacts by email or phone', as: 'anon', op: 'rpc', fn: 'contact_friend_matches_v2',
    args: { identifiers: [victimEmailHash] }, expect: 'denied' },
  { name: 'contact matching doesn\'t find someone who hasn\'t opted in', as: 'stranger', op: 'rpc', fn: 'contact_friend_matches_v2',
    args: { identifiers: [victimEmailHash] }, field: 'id', expect: 'hidden' },
  { name: 'no login cannot send requests by email', as: 'anon', op: 'rpc', fn: 'send_friend_request_by_email',
    args: { target_email: 'bea@personas.example.com' }, expect: 'denied' },
  { name: 'no login cannot remove friends', as: 'anon', op: 'rpc', fn: 'remove_friend',
    args: { target_friend_id: 'victim' }, expect: 'denied' },
  { name: 'no login cannot set up sharing', as: 'anon', op: 'rpc', fn: 'ensure_friend_sharing', args: { request_ids: [] }, expect: 'denied' },
  { name: 'no login cannot get sync scores', as: 'anon', op: 'rpc', fn: 'sync-score', args: { friend_id: 'victim' }, expect: 'denied' },
  { name: 'no login cannot check friendship', as: 'anon', op: 'rpc', fn: 'is_friend', args: { other: 'victim' }, expect: 'denied' },
  { name: 'no login cannot check event visibility', as: 'anon', op: 'rpc', fn: 'cycle_event_visible',
    args: { target_event: { rowOf: 'cycle_events' } }, expect: 'denied' },
  { name: 'no login cannot check event ownership', as: 'anon', op: 'rpc', fn: 'cycle_event_belongs_to',
    args: { target_event: { rowOf: 'cycle_events' }, target_user: 'victim' }, expect: 'denied' },
  { name: 'nobody signed in can check the cron secret', as: 'friend', op: 'rpc', fn: 'cron_secret_matches', args: { provided: 'x' }, expect: 'denied' },
];

export default rows;
