import { Session } from '@supabase/supabase-js';
import { UpdateItem } from './types';

const CREW_ALIAS_POOL = [
  'Red Crewmate',
  'Blue Crewmate',
  'Green Crewmate',
  'Yellow Crewmate',
  'Purple Crewmate',
  'Orange Crewmate',
  'Pink Crewmate',
  'Cyan Crewmate',
  'Black Crewmate',
  'White Crewmate',
  'Brown Crewmate',
  'Lime Crewmate',
] as const;

const sessionIdentityMap = new Map<string, string>();

export function timeAgo(dateValue: string) {
  const date = new Date(dateValue);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function netScore(item: UpdateItem) {
  return (item.upvotes ?? 0) - (item.downvotes ?? 0);
}

export function stationDistanceKm(a: { lat: number; lon: number }, b: { latitude: number; longitude: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.lat);
  const dLon = toRad(b.longitude - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function humanDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.max(100, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(1)} km`;
}

export function formatDateTime(dateValue: string) {
  const date = new Date(dateValue);
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function uniqueStationCount(items: UpdateItem[]) {
  return new Set(items.map((item) => item.stations?.name).filter(Boolean)).size;
}

export function pickCrewAlias(usedNames: Set<string> = new Set()) {
  const normalizedUsed = new Set(Array.from(usedNames).map((name) => name.trim().toLowerCase()).filter(Boolean));
  const available = CREW_ALIAS_POOL.filter((name) => !normalizedUsed.has(name.toLowerCase()));

  const base =
    available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : CREW_ALIAS_POOL[Math.floor(Math.random() * CREW_ALIAS_POOL.length)];

  let candidate = base;
  let suffix = 2;

  while (normalizedUsed.has(candidate.toLowerCase())) {
    candidate = `${base} ${suffix++}`;
  }

  return candidate;
}

export function getDisplayName(session: Session | null, isGuest: boolean) {
  if (isGuest) return 'Visitor';

  const userId = session?.user?.id?.trim();
  if (userId && sessionIdentityMap.has(userId)) {
    return sessionIdentityMap.get(userId) ?? 'Crew Member';
  }

  const next = pickCrewAlias(new Set(sessionIdentityMap.values()));
  if (userId) {
    sessionIdentityMap.set(userId, next);
  }
  return next;
}

export function getInitialLabel(label: string) {
  const first = label.trim().charAt(0).toUpperCase();
  return first || 'U';
}
