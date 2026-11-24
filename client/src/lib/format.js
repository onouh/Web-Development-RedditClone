export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min. ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr. ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} wk. ago`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months} mo. ago`;
  const years = Math.floor(days / 365);
  return `${years} yr. ago`;
}

export function compactNumber(value = 0) {
  const number = Number(value) || 0;
  if (Math.abs(number) < 1000) return String(number);
  if (Math.abs(number) < 1_000_000) return `${(number / 1000).toFixed(number % 1000 === 0 ? 0 : 1)}k`;
  return `${(number / 1_000_000).toFixed(1)}m`;
}

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function initials(name = '?') {
  return name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = ['#FF4500', '#7193FF', '#46D160', '#FFB000', '#A06BE0', '#00A6A6', '#E0529C'];

export function colorFor(seed = '') {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
