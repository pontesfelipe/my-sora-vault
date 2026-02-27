import { supabase } from "@/integrations/supabase/client";

const WEAR_QUEUE_KEY = "lv_offline_wear_queue";
const WATCH_CACHE_KEY = "lv_watch_cache";

// --- Wear Entry Queue ---

interface QueuedWearEntry {
  watch_id: string;
  wear_date: string;
  days: number;
  user_id: string;
  notes: string | null;
  queued_at: number;
}

export function queueWearEntry(entry: QueuedWearEntry) {
  const queue = getWearQueue();
  queue.push(entry);
  localStorage.setItem(WEAR_QUEUE_KEY, JSON.stringify(queue));
}

export function getWearQueue(): QueuedWearEntry[] {
  try {
    return JSON.parse(localStorage.getItem(WEAR_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function clearWearQueue() {
  localStorage.removeItem(WEAR_QUEUE_KEY);
}

export async function syncWearQueue(): Promise<number> {
  const queue = getWearQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  const failed: QueuedWearEntry[] = [];

  for (const entry of queue) {
    const { error } = await supabase.from("wear_entries").insert({
      watch_id: entry.watch_id,
      wear_date: entry.wear_date,
      days: entry.days,
      user_id: entry.user_id,
      notes: entry.notes,
    });

    if (error) {
      failed.push(entry);
    } else {
      synced++;
    }
  }

  if (failed.length > 0) {
    localStorage.setItem(WEAR_QUEUE_KEY, JSON.stringify(failed));
  } else {
    clearWearQueue();
  }

  return synced;
}

// --- Watch Cache ---

export function cacheWatchData(collectionId: string, data: any[]) {
  try {
    const cache = getWatchCache();
    cache[collectionId] = { data, ts: Date.now() };
    localStorage.setItem(WATCH_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full — silently fail
  }
}

export function getCachedWatchData(collectionId: string, maxAgeMs = 24 * 60 * 60 * 1000): any[] | null {
  const cache = getWatchCache();
  const entry = cache[collectionId];
  if (!entry) return null;
  if (Date.now() - entry.ts > maxAgeMs) return null;
  return entry.data;
}

function getWatchCache(): Record<string, { data: any[]; ts: number }> {
  try {
    return JSON.parse(localStorage.getItem(WATCH_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
