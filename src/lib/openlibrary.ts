import type { OLMatch } from "../types";

const FIELDS =
  "key,title,author_name,first_publish_year,cover_i,subject,publisher,number_of_pages_median";

function clean(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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

async function query(params: URLSearchParams): Promise<OLMatch[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Open Library respondeu HTTP ${res.status}`);
    const json = (await res.json()) as { docs?: Record<string, unknown>[] };
    const seen = new Set<string>();
    const out: OLMatch[] = [];
    for (const d of json.docs ?? []) {
      const title = (d.title as string) ?? "";
      const authors = ((d.author_name as string[] | undefined) ?? []).slice(0, 3);
      const k = `${title.toLowerCase()}|${(authors[0] ?? "").toLowerCase()}`;
      if (!title || seen.has(k)) continue;
      seen.add(k);
      out.push({
        key: (d.key as string) ?? "",
        title,
        authors,
        year: d.first_publish_year as number | undefined,
        coverId: (d.cover_i as number | undefined) ?? undefined,
        subjects: ((d.subject as string[] | undefined) ?? [])
          .filter((s) => typeof s === "string" && s.length < 42)
          .slice(0, 6),
        publisher: ((d.publisher as string[] | undefined) ?? [])[0],
        pages: (d.number_of_pages_median as number | undefined) ?? undefined,
      });
      if (out.length >= 5) break;
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

/** Busca correspondências no Open Library (título + autor, com degradê de consultas). */
export async function searchOpenLibrary(title: string, author?: string): Promise<OLMatch[]> {
  const t = clean(title).slice(0, 64);
  if (!t) return [];
  const a = author ? clean(author).slice(0, 48) : "";

  if (a) {
    const p = new URLSearchParams({ title: t, author: a, limit: "8", fields: FIELDS });
    const hits = await query(p);
    if (hits.length) return hits;
  }
  const p2 = new URLSearchParams({ title: t, limit: "8", fields: FIELDS });
  const hits2 = await query(p2);
  if (hits2.length) return hits2;
  const p3 = new URLSearchParams({ q: t, limit: "8", fields: FIELDS });
  return query(p3);
}

export const olCover = (coverId: number, size: "S" | "M" | "L" = "L"): string =>
  `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
