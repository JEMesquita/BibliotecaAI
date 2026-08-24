import type { Book, WeLibMatch } from "../types";

/**
 * Cliente da API WeLib.
 *
 * Dois modos de operação:
 *  - "demo": um servidor WeLib simulado roda embutido no app (catálogo local,
 *    latência realista) — permite experimentar a integração sem credenciais.
 *  - servidor próprio: as chamadas reais usam o contrato REST abaixo, com
 *    token Bearer opcional:
 *      GET    {base}/status          → health-check da conexão
 *      GET    {base}/search?q=&author= → { results: [...] } (ou array)
 *      POST   {base}/items           → multipart: "arquivo" + "metadados" (JSON)
 *      DELETE {base}/items/:id       → remove um volume enviado
 */

export interface WeLibConfig {
  baseUrl: string;
  apiKey: string;
  demo: boolean;
}

export interface WeLibResult {
  ok: boolean;
  status?: number;
  message: string;
}

export interface UploadResult {
  remoteId: string;
}

const LS_KEY = "estante-welib-v1";

export const DEFAULT_WELIB_CONFIG: WeLibConfig = { baseUrl: "", apiKey: "", demo: true };

export function loadWeLibConfig(): WeLibConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_WELIB_CONFIG };
    const p = JSON.parse(raw) as Partial<WeLibConfig>;
    return {
      baseUrl: typeof p.baseUrl === "string" ? p.baseUrl : "",
      apiKey: typeof p.apiKey === "string" ? p.apiKey : "",
      demo: p.demo !== false,
    };
  } catch {
    return { ...DEFAULT_WELIB_CONFIG };
  }
}

export function saveWeLibConfig(cfg: WeLibConfig): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    /* armazenamento indisponível — a sessão segue com a config em memória */
  }
}

export function isWeLibReady(cfg: WeLibConfig): boolean {
  return cfg.demo || cfg.baseUrl.trim().length > 0;
}

export function weLibModeLabel(cfg: WeLibConfig): string {
  if (cfg.demo) return "demo";
  if (cfg.baseUrl.trim()) return "configurado";
  return "off";
}

function cleanBase(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/+$/, "");
}

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const jitter = (min: number, max: number) => min + Math.random() * (max - min);

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Transforma "Dom_Casmurro-(1899).pdf" em um título pesquisável. */
export function guessTitleFromFile(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\(([^)]*)\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(15|16|17|18|19|20)\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* catálogo de demonstração                                            */
/* ------------------------------------------------------------------ */

const DEMO_CATALOG: WeLibMatch[] = [
  { id: "WL-0001", title: "Dom Casmurro", authors: ["Machado de Assis"], year: 1899, publisher: "Livraria Garnier", subjects: ["Romance brasileiro", "Realismo", "Literatura clássica"], pages: 256, isbn: "978-85-0001-001" },
  { id: "WL-0002", title: "Memórias Póstumas de Brás Cubas", authors: ["Machado de Assis"], year: 1881, publisher: "Typographia Nacional", subjects: ["Romance brasileiro", "Realismo"], pages: 336, isbn: "978-85-0001-002" },
  { id: "WL-0003", title: "O Alienista", authors: ["Machado de Assis"], year: 1882, publisher: "Livraria Garnier", subjects: ["Novela", "Sátira", "Literatura brasileira"], pages: 96, isbn: "978-85-0001-003" },
  { id: "WL-0004", title: "Quincas Borba", authors: ["Machado de Assis"], year: 1891, publisher: "Livraria Garnier", subjects: ["Romance brasileiro", "Realismo"], pages: 368, isbn: "978-85-0001-004" },
  { id: "WL-0005", title: "O Cortiço", authors: ["Aluísio Azevedo"], year: 1890, publisher: "Livraria Garnier", subjects: ["Naturalismo", "Romance brasileiro"], pages: 304, isbn: "978-85-0001-005" },
  { id: "WL-0006", title: "Iracema", authors: ["José de Alencar"], year: 1865, publisher: "Typographia Viana", subjects: ["Romantismo", "Indianismo", "Romance brasileiro"], pages: 208, isbn: "978-85-0001-006" },
  { id: "WL-0007", title: "Senhora", authors: ["José de Alencar"], year: 1875, publisher: "Typographia Viana", subjects: ["Romantismo", "Romance brasileiro"], pages: 256, isbn: "978-85-0001-007" },
  { id: "WL-0008", title: "Grande Sertão: Veredas", authors: ["João Guimarães Rosa"], year: 1956, publisher: "José Olympio", subjects: ["Romance brasileiro", "Modernismo", "Sertão"], pages: 624, isbn: "978-85-0001-008" },
  { id: "WL-0009", title: "Vidas Secas", authors: ["Graciliano Ramos"], year: 1938, publisher: "José Olympio", subjects: ["Romance regionalista", "Sertão", "Literatura brasileira"], pages: 176, isbn: "978-85-0001-009" },
  { id: "WL-0010", title: "Capitães da Areia", authors: ["Jorge Amado"], year: 1937, publisher: "José Olympio", subjects: ["Romance brasileiro", "Modernismo"], pages: 288, isbn: "978-85-0001-010" },
  { id: "WL-0011", title: "A Hora da Estrela", authors: ["Clarice Lispector"], year: 1977, publisher: "José Olympio", subjects: ["Novela", "Literatura brasileira"], pages: 96, isbn: "978-85-0001-011" },
  { id: "WL-0012", title: "Triste Fim de Policarpo Quaresma", authors: ["Lima Barreto"], year: 1911, publisher: "Typographia Viana", subjects: ["Pré-modernismo", "Romance brasileiro"], pages: 336, isbn: "978-85-0001-012" },
  { id: "WL-0013", title: "Os Sertões", authors: ["Euclides da Cunha"], year: 1902, publisher: "Laemmert", subjects: ["Ensaio", "História do Brasil", "Canudos"], pages: 632, isbn: "978-85-0001-013" },
  { id: "WL-0014", title: "Dom Quixote", authors: ["Miguel de Cervantes"], year: 1605, publisher: "Francisco de Robles", subjects: ["Romance clássico", "Literatura espanhola", "Sátira"], pages: 864, isbn: "978-85-0001-014" },
  { id: "WL-0015", title: "Hamlet", authors: ["William Shakespeare"], year: 1603, publisher: "Nicholas Ling", subjects: ["Tragédia", "Teatro clássico"], pages: 288, isbn: "978-85-0001-015" },
  { id: "WL-0016", title: "Orgulho e Preconceito", authors: ["Jane Austen"], year: 1813, publisher: "T. Egerton", subjects: ["Romance clássico", "Literatura inglesa"], pages: 432, isbn: "978-85-0001-016" },
  { id: "WL-0017", title: "Crime e Castigo", authors: ["Fiódor Dostoiévski"], year: 1866, publisher: "O Mensageiro Russo", subjects: ["Romance clássico", "Literatura russa"], pages: 672, isbn: "978-85-0001-017" },
  { id: "WL-0018", title: "1984", authors: ["George Orwell"], year: 1949, publisher: "Secker & Warburg", subjects: ["Distopia", "Ficção científica"], pages: 328, isbn: "978-85-0001-018" },
  { id: "WL-0019", title: "A Revolução dos Bichos", authors: ["George Orwell"], year: 1945, publisher: "Secker & Warburg", subjects: ["Sátira política", "Fábula"], pages: 152, isbn: "978-85-0001-019" },
  { id: "WL-0020", title: "O Pequeno Príncipe", authors: ["Antoine de Saint-Exupéry"], year: 1943, publisher: "Reynal & Hitchcock", subjects: ["Literatura infantojuvenil", "Fábula"], pages: 96, isbn: "978-85-0001-020" },
];

function demoSearch(query: string, author?: string): WeLibMatch[] {
  const qt = norm(query)
    .split(/\s+/)
    .filter((t) => t.length > 1);
  const at = author
    ? norm(author)
        .split(/\s+/)
        .filter((t) => t.length > 2)
    : [];
  if (!qt.length && !at.length) return [];

  const scored = DEMO_CATALOG.map((rec) => {
    const titleTokens = norm(rec.title).split(/\s+/);
    const authorTokens = rec.authors.flatMap((a) => norm(a).split(/\s+/));
    let score = 0;
    for (const t of qt) {
      if (titleTokens.some((x) => x === t)) score += 3;
      else if (titleTokens.some((x) => x.startsWith(t) || t.startsWith(x))) score += 2;
      else if (norm(rec.title).includes(t)) score += 1;
      if (authorTokens.some((x) => x === t)) score += 2;
    }
    for (const t of at) {
      if (authorTokens.some((x) => x === t)) score += 3;
      else if (authorTokens.some((x) => x.startsWith(t))) score += 2;
    }
    if (qt.length > 1 && norm(rec.title).includes(norm(query))) score += 4;
    return { rec, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map((s) => s.rec);
}

/* ------------------------------------------------------------------ */
/* modo servidor real                                                  */
/* ------------------------------------------------------------------ */

async function request(cfg: WeLibConfig, path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...((init?.headers as Record<string, string>) ?? {}),
    };
    if (cfg.apiKey.trim()) headers.Authorization = `Bearer ${cfg.apiKey.trim()}`;
    return await fetch(`${cleanBase(cfg.baseUrl)}${path}`, { ...init, headers, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Tempo esgotado — o servidor WeLib não respondeu em 10s.");
    }
    throw new Error("Sem resposta do servidor WeLib (verifique a URL e as regras de CORS).");
  } finally {
    clearTimeout(timer);
  }
}

function toMatch(raw: Record<string, unknown>, i: number): WeLibMatch {
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v : v == null ? undefined : String(v);
  const authors = Array.isArray(raw.authors)
    ? (raw.authors as unknown[])
        .map((a) => (typeof a === "string" ? a : str((a as Record<string, unknown>)?.name)))
        .filter((a): a is string => !!a)
    : typeof raw.author === "string" && raw.author
      ? [raw.author]
      : [];
  return {
    id: str(raw.id) ?? str(raw.key) ?? `EXT-${i + 1}`,
    title: str(raw.title) ?? "Sem título",
    authors,
    year: typeof raw.year === "number" ? raw.year : undefined,
    publisher: str(raw.publisher),
    subjects: Array.isArray(raw.subjects)
      ? (raw.subjects as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 6)
      : [],
    pages: typeof raw.pages === "number" ? raw.pages : undefined,
    isbn: str(raw.isbn),
    coverUrl: str(raw.coverUrl) ?? str(raw.cover),
  };
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

/** Busca correspondências no catálogo WeLib (modo demo ou servidor real). */
export async function searchWeLib(
  cfg: WeLibConfig,
  title: string,
  author?: string
): Promise<WeLibMatch[]> {
  const t = title.trim();
  if (!t) return [];

  if (cfg.demo) {
    await wait(jitter(380, 850));
    const hits = demoSearch(t, author);
    if (hits.length) return hits;
    const short = t.split(/\s+/).slice(0, 2).join(" ");
    return demoSearch(short, author);
  }

  const p = new URLSearchParams({ q: t.slice(0, 96) });
  if (author && author.trim()) p.set("author", author.trim().slice(0, 64));
  const res = await request(cfg, `/search?${p.toString()}`);
  if (!res.ok) throw new Error(`WeLib respondeu HTTP ${res.status} na busca.`);
  const json = (await res.json()) as unknown;
  const list: unknown[] = Array.isArray(json)
    ? json
    : ((json as Record<string, unknown>)?.results as unknown[]) ??
      ((json as Record<string, unknown>)?.docs as unknown[]) ??
      ((json as Record<string, unknown>)?.items as unknown[]) ??
      [];
  return list.slice(0, 5).map((r) => toMatch((r as Record<string, unknown>) ?? {}, list.indexOf(r)));
}

/** Envia um volume (PDF + ficha catalográfica) ao WeLib. */
export async function uploadToWeLib(
  cfg: WeLibConfig,
  book: Book,
  file: Blob | File,
  fileName: string
): Promise<UploadResult> {
  if (cfg.demo) {
    await wait(jitter(650, 1400));
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return { remoteId: `WL-${year}-${rand}` };
  }

  const fd = new FormData();
  fd.append("arquivo", file, fileName);
  fd.append(
    "metadados",
    JSON.stringify({
      titulo: book.title,
      autor: book.author || null,
      ano: book.year ?? null,
      editora: book.publisher ?? null,
      assuntos: book.subjects,
      paginas: book.pages,
      arquivo: fileName,
      bytes: book.size,
    })
  );
  const res = await request(cfg, "/items", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`WeLib respondeu HTTP ${res.status} no envio.`);
  let remoteId = `EXT-${Date.now()}`;
  try {
    const j = (await res.json()) as Record<string, unknown>;
    const v = j?.id ?? j?.remoteId ?? j?.key;
    if (typeof v === "string" && v.trim()) remoteId = v;
  } catch {
    /* resposta sem corpo JSON — mantém o id gerado */
  }
  return { remoteId };
}

/** Remove do WeLib um volume enviado anteriormente. */
export async function removeFromWeLib(cfg: WeLibConfig, remoteId: string): Promise<void> {
  if (cfg.demo) {
    await wait(jitter(300, 600));
    return;
  }
  const res = await request(cfg, `/items/${encodeURIComponent(remoteId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`WeLib respondeu HTTP ${res.status} na remoção.`);
}

/** Testa a conexão com o WeLib (GET /status ou servidor demo). */
export async function testWeLib(cfg: WeLibConfig): Promise<WeLibResult> {
  if (cfg.demo) {
    await wait(jitter(450, 900));
    return {
      ok: true,
      status: 200,
      message: `Servidor de demonstração respondeu — catálogo com ${DEMO_CATALOG.length} registros.`,
    };
  }
  if (!cfg.baseUrl.trim()) {
    return { ok: false, message: "Informe a URL do servidor WeLib (ou ative o modo demonstração)." };
  }
  try {
    const res = await request(cfg, "/status");
    if (res.ok) {
      return { ok: true, status: res.status, message: "Conexão estabelecida — WeLib respondeu ao /status." };
    }
    return {
      ok: false,
      status: res.status,
      message: `WeLib respondeu HTTP ${res.status} — confira a URL e a chave de API.`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha inesperada no teste." };
  }
}
