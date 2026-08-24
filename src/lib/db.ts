import type { Book } from "../types";

const DB_NAME = "estante-virtual";
const DB_VERSION = 1;
const BOOKS = "books";
const FILES = "files";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BOOKS)) db.createObjectStore(BOOKS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Falha ao abrir o banco local"));
  });
  return dbPromise;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(BOOKS, "readonly").objectStore(BOOKS).getAll();
    r.onsuccess = () => resolve((r.result as Book[]).sort((a, b) => b.addedAt - a.addedAt));
    r.onerror = () => reject(r.error);
  });
}

export async function putBook(book: Book): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(BOOKS, "readwrite");
    t.objectStore(BOOKS).put(book);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function saveFile(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(FILES, "readwrite");
    t.objectStore(FILES).put(blob, id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function getFile(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(FILES, "readonly").objectStore(FILES).get(id);
    r.onsuccess = () => resolve(r.result as Blob | undefined);
    r.onerror = () => reject(r.error);
  });
}

export async function deleteBook(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction([BOOKS, FILES], "readwrite");
    t.objectStore(BOOKS).delete(id);
    t.objectStore(FILES).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
