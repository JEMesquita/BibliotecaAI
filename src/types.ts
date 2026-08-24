/** Registro de um livro na estante (metadados persistidos no IndexedDB). */
export interface Book {
  id: string;
  title: string;
  author: string;
  year?: string;
  publisher?: string;
  subjects: string[];
  /** Capa remota vinda do Open Library (covers.openlibrary.org). */
  coverUrl: string | null;
  /** Capa gerada localmente (fallback offline / sem correspondência). */
  coverData: string | null;
  pages: number;
  fileName: string;
  size: number;
  addedAt: number;
  lastOpenedAt: number | null;
  /** Última página lida (0 = ainda não aberto). */
  progressPage: number;
  favorite: boolean;
}

/** Correspondência retornada pela busca no Open Library. */
export interface OLMatch {
  key: string;
  title: string;
  authors: string[];
  year?: number;
  coverId?: number;
  subjects: string[];
  publisher?: string;
  pages?: number;
}

export type ToastKind = "ok" | "info" | "err";

export interface Toast {
  id: number;
  kind: ToastKind;
  msg: string;
}

export const pct = (b: Book): number =>
  b.pages > 0 ? Math.min(100, Math.round((b.progressPage / b.pages) * 100)) : 0;

export const isRead = (b: Book): boolean => b.pages > 0 && b.progressPage >= b.pages;

export const isReading = (b: Book): boolean =>
  b.progressPage > 0 && b.pages > 0 && b.progressPage < b.pages;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Código de chamada estilo Dewey, para o rótulo sob cada volume. */
export function callNumber(b: Book): string {
  const raw = (b.author || b.title || "??").trim().toUpperCase();
  const letters = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
  let h = 0;
  for (const c of raw) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${letters} ${(h % 900) + 100}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
