import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { getFile } from "../lib/db";
import { openPdf } from "../lib/pdf";
import { isRead, pct, type Book } from "../types";
import {
  IconAlert,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconExternal,
  IconSpinner,
  IconX,
} from "./Icons";

interface Props {
  book: Book;
  onClose: () => void;
  onProgress: (bookId: string, page: number) => void;
  onToggleRead: (b: Book) => void;
}

const ZOOMS: Array<{ label: string; value: number | "fit" }> = [
  { label: "Largura da página", value: "fit" },
  { label: "100%", value: 1 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
];

export default function ReaderModal({ book, onClose, onProgress, onToggleRead }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(() =>
    book.pages > 0 ? Math.min(Math.max(book.progressPage, 1), book.pages) : 1
  );
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [containerW, setContainerW] = useState(900);

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderRef = useRef<{ cancel: () => void; promise: Promise<void> } | null>(null);
  const seqRef = useRef(0);
  const blobRef = useRef<Blob | null>(null);
  const progressCb = useRef(onProgress);
  progressCb.current = onProgress;

  /* trava o scroll da página atrás */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* abre o documento */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await getFile(book.id);
        if (!blob) throw new Error("Arquivo não encontrado no armazenamento local.");
        blobRef.current = blob;
        const buf = await blob.arrayBuffer();
        const task = openPdf(buf);
        taskRef.current = task;
        const doc = await task.promise;
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        setPage((p) => Math.min(p, doc.numPages));
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao abrir o PDF.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      renderRef.current?.cancel();
      taskRef.current?.destroy().catch(() => {});
      docRef.current = null;
    };
  }, [book.id]);

  /* observa a largura da área de leitura */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, error]);

  /* renderiza a página atual */
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !numPages) return;
    const seq = ++seqRef.current;
    (async () => {
      try {
        const pg = await doc.getPage(page);
        if (seq !== seqRef.current) return;
        const baseVp = pg.getViewport({ scale: 1 });
        const fit = Math.max(0.2, (containerW - 72) / baseVp.width);
        const scale = zoom === "fit" ? fit : zoom;
        const vp = pg.getViewport({ scale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = `${Math.floor(vp.width)}px`;
        canvas.style.height = `${Math.floor(vp.height)}px`;
        renderRef.current?.cancel();
        const task = pg.render({
          canvas,
          viewport: vp,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        renderRef.current = task;
        await task.promise;
      } catch (e) {
        if ((e as Error)?.name !== "RenderingCancelledException") {
          console.error("Falha ao renderizar página:", e);
        }
      }
    })();
  }, [page, zoom, numPages, containerW]);

  /* salva progresso (com debounce) */
  useEffect(() => {
    if (loading || error || !numPages) return;
    const t = setTimeout(() => progressCb.current(book.id, page), 450);
    return () => clearTimeout(t);
  }, [page, loading, error, numPages, book.id]);

  /* teclado */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT") return;
      if (e.key === "ArrowRight") goPage(page + 1);
      if (e.key === "ArrowLeft") goPage(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, numPages, onClose]);

  function goPage(p: number) {
    if (!numPages) return;
    const next = Math.min(Math.max(p, 1), numPages);
    setPage(next);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function download() {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = book.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function openTab() {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  const p = pct(book);
  const read = isRead(book);

  return (
    <div className="animate-overlayIn fixed inset-0 z-50 flex flex-col bg-deep/95 backdrop-blur-sm">
      {/* topo */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-night/90 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">Sala de leitura</p>
          <h2 className="truncate font-display text-lg font-bold italic leading-tight text-paper">
            {book.title}
          </h2>
          <p className="truncate text-xs text-muted">
            {book.author || "Autor desconhecido"}
            {book.year ? ` · ${book.year}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {numPages > 0 && (
            <select
              value={String(zoom)}
              onChange={(e) => setZoom(e.target.value === "fit" ? "fit" : Number(e.target.value))}
              className="h-9 rounded-md border border-line bg-surface px-2 text-xs text-paper2 outline-none transition-colors hover:border-brass/50 focus:border-brass"
              aria-label="Nível de zoom"
            >
              {ZOOMS.map((z) => (
                <option key={z.label} value={String(z.value)}>
                  {z.label}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={download}
            title="Baixar PDF"
            className="grid h-9 w-9 place-items-center rounded-md border border-line bg-surface text-paper2 transition-colors hover:border-brass/50 hover:text-brass2"
          >
            <IconDownload size={15} />
          </button>
          <button
            onClick={openTab}
            title="Abrir em nova aba"
            className="grid h-9 w-9 place-items-center rounded-md border border-line bg-surface text-paper2 transition-colors hover:border-brass/50 hover:text-brass2"
          >
            <IconExternal size={15} />
          </button>
          <button
            onClick={onClose}
            title="Fechar leitor (Esc)"
            className="grid h-9 w-9 place-items-center rounded-md border border-line bg-surface text-paper2 transition-colors hover:border-ember/60 hover:text-ember"
          >
            <IconX size={15} />
          </button>
        </div>
      </header>

      {/* área de leitura */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-auto bg-[radial-gradient(900px_500px_at_50%_-10%,rgba(217,164,65,0.06),transparent_60%)]"
      >
        {loading && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-3 text-muted">
              <IconSpinner size={30} className="text-brass" />
              <p className="font-mono text-xs tracking-wide">Abrindo “{book.title}”…</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="max-w-sm rounded-lg border border-ember/40 bg-surface p-6 text-center">
              <IconAlert size={26} className="mx-auto text-ember" />
              <p className="mt-3 font-display text-lg font-semibold text-paper">Não foi possível ler</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 rounded-md border border-line bg-night px-4 py-2 text-sm text-paper2 transition-colors hover:border-brass/50 hover:text-brass2"
              >
                Voltar à estante
              </button>
            </div>
          </div>
        )}
        <div className="flex min-h-full items-start justify-center px-4 py-8">
          <canvas
            ref={canvasRef}
            className={`max-w-none rounded-[3px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10 transition-opacity duration-300 ${
              loading || error ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>
      </div>

      {/* controles de navegação */}
      {numPages > 0 && (
        <footer className="border-t border-line bg-night/95 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page <= 1}
                className="grid h-9 w-9 place-items-center rounded-md border border-line bg-surface text-paper2 transition-all enabled:hover:border-brass/50 enabled:hover:text-brass2 disabled:opacity-35"
                aria-label="Página anterior"
              >
                <IconChevronLeft size={16} />
              </button>
              <input
                type="number"
                min={1}
                max={numPages}
                value={page}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) goPage(v);
                }}
                className="h-9 w-16 rounded-md border border-line bg-surface text-center font-mono text-xs text-paper outline-none focus:border-brass"
                aria-label="Página atual"
              />
              <span className="font-mono text-xs text-muted">/ {numPages}</span>
              <button
                onClick={() => goPage(page + 1)}
                disabled={page >= numPages}
                className="grid h-9 w-9 place-items-center rounded-md border border-line bg-surface text-paper2 transition-all enabled:hover:border-brass/50 enabled:hover:text-brass2 disabled:opacity-35"
                aria-label="Próxima página"
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            <input
              type="range"
              min={1}
              max={numPages}
              value={page}
              onChange={(e) => goPage(Number(e.target.value))}
              className="reader-range min-w-40 flex-1"
              style={{ "--fill": `${((page - 1) / Math.max(numPages - 1, 1)) * 100}%` } as CSSProperties}
              aria-label="Progresso da leitura"
            />

            <span className="font-mono text-xs text-brass2">{p}% lido</span>

            <button
              onClick={() => onToggleRead(book)}
              className={`ml-auto inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-all ${
                read
                  ? "border-line bg-surface text-paper2 hover:border-ember/50 hover:text-ember"
                  : "border-moss/50 bg-moss/10 text-moss hover:bg-moss/20"
              }`}
            >
              <IconCheck size={14} />
              {read ? "Marcar como não lido" : "Marcar como lido"}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
