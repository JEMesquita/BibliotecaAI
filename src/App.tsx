import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteBook, getAllBooks, putBook } from "./lib/db";
import { domCasmurroSample } from "./lib/samplePdf";
import {
  formatBytes,
  formatDate,
  isRead,
  isReading,
  pct,
  type Book,
  type Toast,
  type ToastKind,
} from "./types";
import { BookCard, BookRow } from "./components/BookCard";
import ReaderModal from "./components/ReaderModal";
import CatalogModal from "./components/CatalogModal";
import { ConfirmDialog, EditBookModal, Toasts } from "./components/Dialogs";
import {
  IconBookOpen,
  IconGrid,
  IconLamp,
  IconLogo,
  IconRows,
  IconSearch,
  IconUpload,
  IconX,
} from "./components/Icons";

type StatusKey = "todos" | "favoritos" | "lendo" | "lidos" | "novos";
type SortKey = "recentes" | "titulo" | "autor" | "progresso";
type ViewKey = "estante" | "lista";

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatBlock({ label, value, note }: { label: string; value: number; note?: string }) {
  const v = useCountUp(value);
  return (
    <div className="px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-black leading-none text-paper">{v.toLocaleString("pt-BR")}</p>
      {note && <p className="mt-1 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

function ShelfIllustration() {
  const spines: Array<[number, number, number, string]> = [
    [14, 62, 20, "#7a4a3a"],
    [38, 70, 18, "#2b4a3c"],
    [60, 58, 24, "#d9a441"],
    [88, 74, 17, "#25384f"],
    [109, 64, 21, "#54401e"],
    [134, 72, 19, "#41304b"],
    [157, 55, 22, "#204141"],
    [183, 68, 18, "#5a3823"],
    [214, 74, 20, "#52302a"],
    [238, 60, 18, "#2b4a3c"],
    [262, 71, 24, "#8a6a2f"],
    [292, 58, 17, "#25384f"],
    [314, 66, 21, "#7a4a3a"],
    [340, 73, 19, "#204141"],
    [364, 60, 22, "#54401e"],
  ];
  const rows = [86, 172, 258];
  return (
    <svg viewBox="0 0 400 268" className="w-full" role="img" aria-label="Ilustração de uma estante de livros">
      {rows.map((y, r) => (
        <g key={y}>
          {spines
            .filter((_, i) => (i + r) % 3 !== 2 || i % 2 === 0)
            .map(([x, h, w, c], i) => (
              <g key={`${y}-${i}`} transform={i === 4 && r === 1 ? `rotate(-8 ${x + w} ${y})` : undefined}>
                <rect x={x} y={y - h} width={w} height={h} rx="1.5" fill={c} />
                <rect x={x + 3} y={y - h + 8} width={w - 6} height="2.5" rx="1" fill="rgba(237,195,107,0.55)" />
                <rect x={x + w - 4} y={y - h} width="4" height={h} rx="1.5" fill="rgba(0,0,0,0.25)" />
              </g>
            ))}
          <rect x="4" y={y} width="392" height="9" rx="2" fill="#3a2c18" />
          <rect x="4" y={y} width="392" height="2.5" rx="1" fill="rgba(255,255,255,0.09)" />
        </g>
      ))}
      <rect x="0" y="0" width="6" height="268" fill="#2c2113" />
      <rect x="394" y="0" width="6" height="268" fill="#2c2113" />
    </svg>
  );
}

function EmptyState({ onUpload, onSample }: { onUpload: () => void; onSample: () => void }) {
  return (
    <section className="animate-fadeUp mx-auto mt-8 grid max-w-5xl items-center gap-10 pb-20 lg:grid-cols-[1.15fr_1fr] lg:mt-14">
      <div className="relative rounded-md bg-[#efe7d3] p-7 text-[#241f12] shadow-[0_36px_80px_-24px_rgba(0,0,0,0.85)] transition-transform duration-500 sm:p-9 lg:-rotate-1 lg:hover:rotate-0">
        <span className="pointer-events-none absolute inset-x-0 top-8 h-px bg-[#c05248]/60" />
        <p className="font-mono text-[10px] tracking-[0.28em] text-[#8a6a2f]">FICHA Nº 001 · SETOR DE AQUISIÇÕES</p>
        <h2 className="mt-4 font-display text-3xl font-black leading-[1.08] sm:text-[2.6rem]">
          Sua estante começa com um PDF.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#57503a]">
          Arraste arquivos <strong>.pdf</strong> para qualquer lugar desta página. A estante consulta o{" "}
          <strong>Open Library</strong> em busca de capa, autor e ano — você confirma a edição e o volume entra
          catalogado, pronto para ler no navegador.
        </p>
        <ol className="mt-6 space-y-2.5">
          {[
            "Envie um ou vários PDFs de uma vez",
            "Confirme a edição encontrada no Open Library",
            "Leia aqui mesmo, com progresso salvo automaticamente",
          ].map((step, i) => (
            <li key={step} className="flex items-center gap-3 font-mono text-[11px] text-[#6b5f3e]">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#16231a] text-[10px] font-bold text-[#edc36b]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-2 rounded-md bg-[#16231a] px-5 py-3 text-sm font-bold text-[#edc36b] shadow-md transition-all hover:bg-[#1e3123] active:scale-95"
          >
            <IconUpload size={16} /> Enviar PDFs
          </button>
          <button
            onClick={onSample}
            className="inline-flex items-center gap-2 rounded-md border border-[#b7ab88] px-5 py-3 text-sm font-semibold text-[#5a5138] transition-all hover:border-[#8a6a2f] hover:text-[#241f12] active:scale-95"
          >
            <IconBookOpen size={16} /> Gerar livro de exemplo
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-lg border border-line bg-surface/60 p-5">
          <ShelfIllustration />
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-line bg-surface/60 p-4">
          <IconLamp size={18} className="mt-0.5 shrink-0 text-brass" />
          <p className="text-xs leading-relaxed text-muted">
            Tudo fica <span className="text-paper2">salvo neste navegador</span> — arquivos, capas e progresso de
            leitura. Nenhum byte sai do seu computador, exceto a consulta de metadados ao Open Library.
          </p>
        </div>
      </div>
    </section>
  );
}

function SkeletonShelf() {
  return (
    <div className="mt-6 grid gap-x-4 gap-y-9" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 90}ms` }}>
          <div className="aspect-[2/3] rounded-[4px] bg-surface" />
          <div className="mt-1.5 h-2 rounded-[2px] bg-surface/70" />
          <div className="mt-2.5 h-3.5 w-4/5 rounded bg-surface" />
          <div className="mt-1.5 h-2.5 w-3/5 rounded bg-surface/70" />
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusKey>("todos");
  const [sort, setSort] = useState<SortKey>("recentes");
  const [view, setView] = useState<ViewKey>("estante");
  const [catalogFiles, setCatalogFiles] = useState<File[] | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(1);

  const notify = useCallback((kind: ToastKind, msg: string) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4400);
  }, []);

  /* carrega o acervo */
  useEffect(() => {
    getAllBooks()
      .then((b) => setBooks(b))
      .catch(() => notify("err", "Não foi possível abrir o armazenamento local do navegador."))
      .finally(() => setLoading(false));
  }, [notify]);

  /* atalho "/" foca a busca */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const acceptFiles = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list);
      const pdfs = files.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
      if (!pdfs.length) {
        notify("err", "Nenhum PDF encontrado — envie arquivos .pdf.");
        return;
      }
      if (files.length > pdfs.length) {
        notify("info", `${files.length - pdfs.length} arquivo(s) ignorado(s): só entram PDFs na estante.`);
      }
      setCatalogFiles(pdfs);
    },
    [notify]
  );

  /* arrastar e soltar em qualquer lugar */
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragActive(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragActive(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragActive(false);
      if (e.dataTransfer?.files.length) acceptFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [acceptFiles]);

  const updateBook = useCallback(
    (updated: Book) => {
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      putBook(updated).catch(() => notify("err", "Não foi possível salvar a alteração."));
    },
    [notify]
  );

  const openReader = useCallback(
    (b: Book) => {
      setReadingId(b.id);
      updateBook({ ...b, lastOpenedAt: Date.now() });
    },
    [updateBook]
  );

  const toggleFav = useCallback(
    (b: Book) => {
      updateBook({ ...b, favorite: !b.favorite });
      if (!b.favorite) notify("ok", `"${b.title}" entrou para os favoritos.`);
    },
    [updateBook, notify]
  );

  const handleProgress = useCallback((bookId: string, page: number) => {
    setBooks((prev) => {
      const next = prev.map((b) =>
        b.id === bookId ? { ...b, progressPage: Math.min(page, b.pages), lastOpenedAt: Date.now() } : b
      );
      const b = next.find((x) => x.id === bookId);
      if (b) putBook(b).catch(() => {});
      return next;
    });
  }, []);

  const toggleRead = useCallback(
    (b: Book) => {
      const done = isRead(b);
      updateBook({ ...b, progressPage: done ? 0 : b.pages });
      notify("ok", done ? `"${b.title}" voltou para a pilha de leitura.` : `"${b.title}" marcado como lido. Boa!`);
    },
    [updateBook, notify]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    const b = deleting;
    setDeleting(null);
    try {
      await deleteBook(b.id);
      setBooks((prev) => prev.filter((x) => x.id !== b.id));
      if (readingId === b.id) setReadingId(null);
      notify("ok", `"${b.title}" foi removido da estante.`);
    } catch {
      notify("err", "Falha ao remover o volume do armazenamento local.");
    }
  }, [deleting, readingId, notify]);

  const onCatalogDone = useCallback(
    (created: Book[]) => {
      setCatalogFiles(null);
      setBooks((prev) => [...created, ...prev]);
      notify("ok", created.length === 1 ? "1 volume catalogado — boa leitura!" : `${created.length} volumes catalogados — boa leitura!`);
    },
    [notify]
  );

  const addSample = useCallback(() => {
    setCatalogFiles([domCasmurroSample()]);
    notify("info", "PDF de exemplo gerado — veja o Open Library reconhecendo a obra.");
  }, [notify]);

  const counts = useMemo(
    () => ({
      todos: books.length,
      favoritos: books.filter((b) => b.favorite).length,
      lendo: books.filter(isReading).length,
      lidos: books.filter(isRead).length,
      novos: books.filter((b) => b.progressPage === 0).length,
    }),
    [books]
  );

  const filtered = useMemo(() => {
    let list = books;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((b) =>
        [b.title, b.author, b.publisher ?? "", b.fileName, b.year ?? "", ...b.subjects]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (status === "favoritos") list = list.filter((b) => b.favorite);
    if (status === "lendo") list = list.filter(isReading);
    if (status === "lidos") list = list.filter(isRead);
    if (status === "novos") list = list.filter((b) => b.progressPage === 0);

    const arr = [...list];
    if (sort === "titulo") arr.sort((a, b) => a.title.localeCompare(b.title, "pt"));
    if (sort === "autor") arr.sort((a, b) => (a.author || "\uffff").localeCompare(b.author || "\uffff", "pt"));
    if (sort === "progresso") arr.sort((a, b) => pct(b) - pct(a) || b.addedAt - a.addedAt);
    return arr;
  }, [books, query, status, sort]);

  const totals = useMemo(
    () => ({
      pages: books.reduce((s, b) => s + b.pages, 0),
      bytes: books.reduce((s, b) => s + b.size, 0),
    }),
    [books]
  );

  const reading = useMemo(() => books.find((b) => b.id === readingId) ?? null, [books, readingId]);

  const motes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        left: `${(i * 37 + 13) % 100}%`,
        top: `${28 + ((i * 53) % 62)}%`,
        size: 2 + (i % 3),
        dur: 12 + (i % 5) * 3,
        delay: (i * 1.9) % 14,
      })),
    []
  );

  const filtersActive = query.trim() !== "" || status !== "todos";
  const chips: Array<{ key: StatusKey; label: string }> = [
    { key: "todos", label: "Todos" },
    { key: "favoritos", label: "Favoritos" },
    { key: "lendo", label: "Lendo" },
    { key: "lidos", label: "Lidos" },
    { key: "novos", label: "Novos" },
  ];

  const searchInput = (extraCls = "") => (
    <div className={`relative ${extraCls}`}>
      <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={searchRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por título, autor, assunto…"
        className="h-10 w-full rounded-md border border-line bg-surface/80 pl-9 pr-9 text-sm text-paper outline-none transition-colors placeholder:text-muted/60 focus:border-brass"
        aria-label="Buscar na estante"
      />
      {query ? (
        <button
          onClick={() => setQuery("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-paper"
          aria-label="Limpar busca"
        >
          <IconX size={13} />
        </button>
      ) : (
        <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-night px-1.5 font-mono text-[10px] text-muted sm:block">
          /
        </kbd>
      )}
    </div>
  );

  return (
    <div className="min-h-screen font-body text-paper">
      {/* poeira ambiente */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {motes.map((m, i) => (
          <span
            key={i}
            className="dust"
            style={{
              left: m.left,
              top: m.top,
              width: m.size,
              height: m.size,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
            }}
          />
        ))}
      </div>
      <div
        className="animate-lamp pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px]"
        style={{ background: "radial-gradient(640px 320px at 50% 0%, rgba(217,164,65,0.10), transparent 70%)" }}
        aria-hidden
      />

      {/* topo */}
      <header className="sticky top-0 z-40 border-b border-line bg-night/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <IconLogo size={30} />
            <div className="leading-none">
              <p className="font-display text-[22px] font-black italic tracking-tight text-paper">Estante</p>
              <p className="mt-0.5 hidden font-mono text-[9px] tracking-[0.22em] text-muted md:block">
                BIBLIOTECA PESSOAL · PDF · OPEN LIBRARY
              </p>
            </div>
          </div>

          <div className="hidden flex-1 justify-center sm:flex">
            {searchInput("w-full max-w-md")}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-brass px-3.5 text-sm font-bold text-night transition-all hover:bg-brass2 active:scale-95 sm:px-4"
            >
              <IconUpload size={15} />
              <span className="hidden sm:inline">Enviar PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) acceptFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <div className="px-4 pb-3 sm:hidden">{searchInput()}</div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {loading ? (
          <>
            <div className="mt-6 h-28 animate-pulse rounded-lg border border-line bg-surface/60" />
            <SkeletonShelf />
          </>
        ) : books.length === 0 ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} onSample={addSample} />
        ) : (
          <>
            {/* ficha do acervo */}
            <section className="animate-fadeUp mt-6 overflow-hidden rounded-lg border border-line bg-surface/70">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-line px-5 py-2.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">Ficha do acervo</p>
                <p className="font-mono text-[10px] text-muted">
                  atualizada em {formatDate(Date.now())} · armazenamento local
                </p>
              </div>
              <div className="grid grid-cols-2 divide-y divide-dashed divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
                <StatBlock label="Volumes" value={counts.todos} />
                <StatBlock label="Páginas" value={totals.pages} />
                <StatBlock label="Lidos" value={counts.lidos} note={`de ${counts.todos} volumes`} />
                <StatBlock label="Em leitura" value={counts.lendo} />
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Espaço</p>
                  <p className="mt-1 font-display text-3xl font-black leading-none text-paper">
                    {formatBytes(totals.bytes)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">armazenados neste navegador</p>
                </div>
              </div>
            </section>

            {/* barra de filtros */}
            <section className="mt-7 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {chips.map((c) => {
                  const active = status === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setStatus(c.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                        active
                          ? "border-brass bg-brass text-night shadow-[0_4px_16px_-4px_rgba(217,164,65,0.5)]"
                          : "border-line bg-surface/60 text-paper2 hover:border-line2 hover:text-paper"
                      }`}
                    >
                      {c.label}
                      <span className={`font-mono text-[10px] ${active ? "text-night/70" : "text-muted"}`}>
                        {counts[c.key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto flex items-center gap-2.5">
                <p className="hidden font-mono text-[11px] text-muted sm:block">
                  {filtered.length} de {books.length} volumes
                </p>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-9 rounded-md border border-line bg-surface px-2.5 text-xs text-paper2 outline-none transition-colors hover:border-brass/50 focus:border-brass"
                  aria-label="Ordenar estante"
                >
                  <option value="recentes">Mais recentes</option>
                  <option value="titulo">Título A–Z</option>
                  <option value="autor">Autor A–Z</option>
                  <option value="progresso">Progresso</option>
                </select>
                <div className="flex overflow-hidden rounded-md border border-line">
                  <button
                    onClick={() => setView("estante")}
                    title="Ver como estante"
                    className={`grid h-9 w-9 place-items-center transition-colors ${
                      view === "estante" ? "bg-brass text-night" : "bg-surface text-muted hover:text-paper"
                    }`}
                  >
                    <IconGrid size={14} />
                  </button>
                  <button
                    onClick={() => setView("lista")}
                    title="Ver como lista"
                    className={`grid h-9 w-9 place-items-center border-l border-line transition-colors ${
                      view === "lista" ? "bg-brass text-night" : "bg-surface text-muted hover:text-paper"
                    }`}
                  >
                    <IconRows size={14} />
                  </button>
                </div>
              </div>
            </section>

            {/* acervo */}
            {filtered.length === 0 ? (
              <div className="animate-fadeUp mx-auto mt-16 max-w-sm pb-24 text-center">
                <IconSearch size={30} className="mx-auto text-line2" />
                <h3 className="mt-4 font-display text-xl font-bold italic text-paper">Nada por aqui…</h3>
                <p className="mt-1.5 text-sm text-muted">
                  Nenhum volume corresponde à busca ou ao filtro atual.
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setStatus("todos");
                  }}
                  className="mt-5 rounded-md border border-line bg-surface px-4 py-2 text-sm text-paper2 transition-colors hover:border-brass/50 hover:text-brass2"
                >
                  Limpar filtros
                </button>
              </div>
            ) : view === "estante" ? (
              <section
                className="mt-6 grid gap-x-4 gap-y-9 pb-20"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
              >
                {filtered.map((b, i) => (
                  <BookCard
                    key={b.id}
                    book={b}
                    index={i}
                    onOpen={openReader}
                    onToggleFav={toggleFav}
                    onEdit={setEditing}
                    onAskDelete={setDeleting}
                  />
                ))}
              </section>
            ) : (
              <section className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface/50 pb-20">
                {filtered.map((b, i) => (
                  <BookRow
                    key={b.id}
                    book={b}
                    index={i}
                    onOpen={openReader}
                    onToggleFav={toggleFav}
                    onEdit={setEditing}
                    onAskDelete={setDeleting}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {/* rodapé */}
      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 font-mono text-[11px] text-muted sm:px-6">
          <p>
            Estante · biblioteca pessoal — {books.length} {books.length === 1 ? "volume" : "volumes"},{" "}
            {formatBytes(totals.bytes)}
          </p>
          <p className="flex flex-wrap items-center gap-x-2">
            <span>
              capas &amp; metadados: <span className="text-brass2">Open Library</span> · leitor: pdf.js · tudo salvo
              neste navegador
            </span>
            <span className="text-line2">·</span>
            <a
              href="./mockup.html"
              className="rounded border border-line px-2 py-0.5 transition-colors hover:border-brass/60 hover:text-brass2"
            >
              mockup de apresentação ↗
            </a>
          </p>
        </div>
      </footer>

      {/* sobreposição de drop */}
      {dragActive && (
        <div className="animate-overlayIn pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-night/90 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border-2 border-dashed border-brass bg-surface/60 px-10 py-14 text-center shadow-[0_0_80px_-10px_rgba(217,164,65,0.25)]">
            <IconUpload size={40} className="mx-auto text-brass" />
            <h2 className="mt-4 font-display text-3xl font-black italic text-paper">Solte os PDFs aqui</h2>
            <p className="mt-2 font-mono text-xs tracking-wide text-muted">
              os volumes serão lidos e catalogados na hora
            </p>
          </div>
        </div>
      )}

      {/* modais */}
      {catalogFiles && (
        <CatalogModal
          files={catalogFiles}
          notify={notify}
          onDone={onCatalogDone}
          onCancel={() => setCatalogFiles(null)}
        />
      )}

      {reading && (
        <ReaderModal
          book={reading}
          onClose={() => setReadingId(null)}
          onProgress={handleProgress}
          onToggleRead={toggleRead}
        />
      )}

      {editing && (
        <EditBookModal
          book={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            updateBook(updated);
            setEditing(null);
            notify("ok", "Ficha catalográfica atualizada.");
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Remover da estante?"
          message={
            <>
              <strong className="text-paper">“{deleting.title}”</strong> será removido do acervo, junto com o arquivo
              PDF e o progresso de leitura. Essa ação não pode ser desfeita.
            </>
          }
          confirmLabel="Remover volume"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
