import type { Row } from '../engine';

// The profile-avatars bucket: anyone can read (avatars are public on purpose), and only the
// owner can upload, replace or delete files in their own folder (<user id>/...).
const bucket = 'profile-avatars';

const rows: Row[] = [
  { name: 'anyone can read an avatar', as: 'stranger', op: 'storage', action: 'read', bucket,
    path: 'victim/security-matrix.txt', existing: true, expect: 'allowed' },
  { name: 'the owner can upload to their own folder', as: 'owner', op: 'storage', action: 'upload', bucket,
    path: 'self/security-matrix.txt', expect: 'allowed' },
  { name: 'a stranger cannot upload into the victim\'s folder', as: 'stranger', op: 'storage', action: 'upload', bucket,
    path: 'victim/security-matrix.txt', expect: 'denied' },
  { name: 'no login cannot upload', as: 'anon', op: 'storage', action: 'upload', bucket,
    path: 'victim/security-matrix.txt', expect: 'denied' },
  { name: 'the owner can replace their own avatar', as: 'owner', op: 'storage', action: 'update', bucket,
    path: 'self/security-matrix.txt', existing: true, expect: 'allowed' },
  { name: 'a friend cannot replace the victim\'s avatar', as: 'friend', op: 'storage', action: 'update', bucket,
    path: 'victim/security-matrix.txt', existing: true, expect: 'hidden' },
  { name: 'the owner can delete their own avatar', as: 'owner', op: 'storage', action: 'delete', bucket,
    path: 'self/security-matrix.txt', existing: true, expect: 'allowed' },
  { name: 'a stranger cannot delete the victim\'s avatar', as: 'stranger', op: 'storage', action: 'delete', bucket,
    path: 'victim/security-matrix.txt', existing: true, expect: 'hidden' },
  { name: 'no login cannot delete an avatar', as: 'anon', op: 'storage', action: 'delete', bucket,
    path: 'victim/security-matrix.txt', existing: true, expect: 'hidden' },
];

export default rows;
