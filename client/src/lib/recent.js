const KEY = 'threadit-recent';
const EVENT = 'threadit-recent';

export function getRecentCommunities() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentCommunity(community) {
  if (!community?.name) return;
  const next = [
    { name: community.name, iconUrl: community.iconUrl || '' },
    ...getRecentCommunities().filter((item) => item.name !== community.name),
  ].slice(0, 5);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Recent history is a convenience only.
  }
}

export const RECENT_EVENT = EVENT;
