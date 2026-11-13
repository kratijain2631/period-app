export type MemberIdentity = {
  member_id: string;
  full_name: string | null;
  alias: string | null;
  avatar_url: string | null;
};

export function memberName(name?: string | null, alias?: string | null) {
  return name?.trim() || alias?.trim().replace(/^@+/, '') || '';
}

export function memberInitial(name: string) {
  return Array.from(name.trim().replace(/^@+/, ''))[0]?.toLocaleUpperCase() || '•';
}
