// Display name for a phase value such as 'follicular' or 'pms'.
// 'pms' is an acronym, so it shows as "PMS", not "Pms".
export const formatPhaseName = (value: string): string => {
  if (value.toLowerCase() === 'pms') {
    return 'PMS';
  }
  const normalized = value.replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};
