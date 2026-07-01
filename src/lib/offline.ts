"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface QueuedSubmission {
  clientId: string;
  token: string;
  // Plaintext answers, or an encrypted payload for end-to-end encrypted forms.
  data?: Record<string, unknown>;
  enc?: { encKey: string; encIv: string; encData: string };
  geo?: { lat: number; lng: number };
  deviceId: string;
  createdAt: number;
}

interface AfinDB extends DBSchema {
  queue: {
    key: string;
    value: QueuedSubmission;
  };
}

let dbp: Promise<IDBPDatabase<AfinDB>> | null = null;

function getDB() {
  if (!dbp) {
    dbp = openDB<AfinDB>("afin-offline", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("queue")) {
          db.createObjectStore("queue", { keyPath: "clientId" });
        }
      },
    });
  }
  return dbp;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("afin_device");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("afin_device", id);
  }
  return id;
}

export async function enqueue(item: QueuedSubmission): Promise<void> {
  const db = await getDB();
  await db.put("queue", item);
}

export async function pending(): Promise<QueuedSubmission[]> {
  const db = await getDB();
  return db.getAll("queue");
}

export async function pendingCount(): Promise<number> {
  const db = await getDB();
  return db.count("queue");
}

export async function dequeue(clientId: string): Promise<void> {
  const db = await getDB();
  await db.delete("queue", clientId);
}

// Try to push every queued submission. Returns how many synced.
export async function syncQueue(): Promise<number> {
  const items = await pending();
  let synced = 0;
  for (const item of items) {
    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: item.token,
          data: item.data,
          enc: item.enc,
          clientId: item.clientId,
          deviceId: item.deviceId,
          geo: item.geo,
        }),
      });
      // Drop on success or permanent rejection (validation/closed) to avoid stuck items.
      if (res.ok || res.status === 422 || res.status === 403 || res.status === 404) {
        await dequeue(item.clientId);
        if (res.ok) synced += 1;
      }
    } catch {
      break; // still offline
    }
  }
  return synced;
}
