import { useEffect, useRef, useState } from "react";
import { putBook, saveFile } from "../lib/db";
import { guessTitleFromFile, olCover, searchOpenLibrary } from "../lib/openlibrary";
import { readPdfInfo, type PdfInfo } from "../lib/pdf";
import { makeCover } from "../lib/cover";
import { formatBytes, uid, type Book, type OLMatch, type ToastKind } from "../types";
import { IconAlert, IconBookOpen, IconFile, IconPencil, IconSpinner, IconX } from "./Icons";

interface Item {
  file: File;
  info: PdfInfo | null;
  status: "lendo" | "buscando" | "pronto" | "erro";
  error?: string;
  matches: OLMatch[];
  selected: number; // índice em matches; -1 = manual
  fields: { title: string; author: string; year: string; publisher: string };
  subjects: string[];
  coverUrl: string | null;
}

interface Props {
  files: File[];
  notify: (kind: ToastKind, msg: string) => void;
  onDone: (books: Book[]) => void;
  onCancel: () => void;
}

export default function CatalogModal({ files, notify, onDone, onCancel }: Props) {
  const [items, setItems] = useState<Item[]>(() =>
    files.map((file) => ({
      file,
      info: null,
      status: "lendo" as const,
      matches: [],
      selected: -1,
      fields: { title: guessTitleFromFile(file.name), author: "", year: "", publisher: "" },
      subjects: [],
      coverUrl: null,
    }))
  );
  const [saving, setSaving] = useState(0);
  const [phase, setPhase] = useState<"edit" | "saving">("edit");
  const startedRef = useRef(false);

  function patch(idx: number, part: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...part } : it)));
  }

  function applyMatch(idx: number, matches: OLMatch[], sel: number) {
    if (sel >= 0 && matches[sel]) {
      const m = matches[sel];
      patch(idx, {
        matches,
        selected: sel,
        fields: {
          title: m.title,
          author: m.authors.join(", "),
          year: m.year ? String(m.year) : "",
          publisher: m.publisher ?? "",
        },
        subjects: m.subjects,
        coverUrl: m.coverId ? olCover(m.coverId, "L") : null,
        status: "pronto",
      });
    } else {
      patch(idx, { matches, selected: -1, coverUrl: null, status: "pronto" });
    }
  }

  async function process(idx: number, file: File) {
    patch(idx, { status: "lendo", error: undefined });
    let info: PdfInfo | null = null;
    try {
      info = await readPdfInfo(await file.arrayBuffer());
    } catch {
      patch(idx, {
        status: "erro",
        error: "Não foi possível ler este PDF (arquivo corrompido ou protegido). Você ainda pode cadastrá-lo manualmente.",
      });
      return;
    }
    const guess = info.title && info.title.trim().length > 2 ? info.title.trim() : guessTitleFromFile(file.name);
    patch(idx, {
      info,
      status: "buscando",
      fields: { title: guess, author: info.author ?? "", year: "", publisher: "" },
    });
    try {
      const matches = await searchOpenLibrary(guess, info.author);
      applyMatch(idx, matches, matches.length ? 0 : -1);
    } catch {
      patch(idx, {
        status: "erro",
        error: "Sem conexão com o Open Library agora. Tente novamente ou cadastre manualmente.",
      });
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    files.forEach((f, i) => void process(i, f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allReady = items.every((i) => i.status === "pronto");

  async function saveAll() {
    if (phase === "saving") return;
    setPhase("saving");
    const created: Book[] = [];
    try {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const id = uid();
        const title = it.fields.title.trim() || guessTitleFromFile(it.file.name);
        const author = it.fields.author.trim();
        const book: Book = {
          id,
          title,
          author,
          year: it.fields.year.trim() || undefined,
          publisher: it.fields.publisher.trim() || undefined,
          subjects: it.subjects,
          coverUrl: it.coverUrl,
          coverData: await makeCover(title, author),
          pages: it.info?.pages ?? 0,
          fileName: it.file.name,
          size: it.file.size,
          addedAt: Date.now() + i,
          lastOpenedAt: null,
          progressPage: 0,
          favorite: false,
        };
        await saveFile(id, it.file);
        await putBook(book);
        created.push(book);
        setSaving(created.length);
      }
      onDone(created);
    } catch {
      notify("err", "Falha ao salvar no armazenamento local do navegador.");
      setPhase("edit");
    }
  }

  const inputCls =
    "w-full rounded-md border border-line bg-night px-3 py-2 text-sm text-paper outline-none transition-colors placeholder:text-muted/50 focus:border-brass";

  return (
    <div
      className="animate-overlayIn fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-deep/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && phase !== "saving") onCancel();
      }}
    >
      <div className="animate-modalIn my-8 w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-surface shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]">
        {/* cabeçalho */}
        <div className="flex items-center justify-between border-b border-line bg-night/60 px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Balcão de aquisição</p>
            <h3 className="font-display text-xl font-bold text-paper">
              Catalogar {items.length === 1 ? "1 volume" : `${items.length} volumes`}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={phase === "saving"}
            className="grid h-9 w-9 place-items-center rounded-md border border-line text-paper2 transition-colors enabled:hover:border-ember/50 enabled:hover:text-ember disabled:opacity-40"
            aria-label="Cancelar catalogação"
          >
            <IconX size={15} />
          </button>
        </div>

        {/* itens */}
        <div className={`max-h-[58vh] divide-y divide-line overflow-y-auto ${phase === "saving" ? "pointer-events-none opacity-50" : ""}`}>
          {items.map((it, idx) => (
            <section key={it.file.name + idx} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-night text-brass">
                  <IconFile size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-paper" title={it.file.name}>
                    {it.file.name}
                  </p>
                  <p className="font-mono text-[11px] text-muted">
                    {formatBytes(it.file.size)}
                    {it.info ? ` · ${it.info.pages} páginas no PDF` : ""}
                  </p>
                </div>
                {it.status === "lendo" && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-night px-3 py-1 font-mono text-[11px] text-paper2">
                    <IconSpinner size={12} className="text-brass" /> lendo PDF…
                  </span>
                )}
                {it.status === "buscando" && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-brass/10 px-3 py-1 font-mono text-[11px] text-brass2">
                    <IconSpinner size={12} /> Open Library…
                  </span>
                )}
              </div>

              {it.status === "erro" && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-ember/40 bg-ember/10 px-4 py-3">
                  <IconAlert size={16} className="shrink-0 text-ember" />
                  <p className="min-w-0 flex-1 text-xs leading-relaxed text-paper2">{it.error}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void process(idx, it.file)}
                      className="rounded-md border border-line bg-night px-3 py-1.5 text-xs font-semibold text-paper2 transition-colors hover:border-brass/50 hover:text-brass2"
                    >
                      Tentar de novo
                    </button>
                    <button
                      onClick={() => patch(idx, { status: "pronto", error: undefined })}
                      className="rounded-md border border-line bg-night px-3 py-1.5 text-xs font-semibold text-paper2 transition-colors hover:border-brass/50 hover:text-brass2"
                    >
                      Cadastrar manualmente
                    </button>
                  </div>
                </div>
              )}

              {it.status === "pronto" && (
                <>
                  {it.matches.length > 0 ? (
                    <div className="mt-4">
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                        Correspondências no Open Library — escolha a edição
                      </p>
                      <div className="flex gap-2.5 overflow-x-auto pb-2">
                        {it.matches.map((m, mi) => {
                          const active = it.selected === mi;
                          return (
                            <button
                              key={m.key + mi}
                              onClick={() => applyMatch(idx, it.matches, mi)}
                              className={`w-[86px] shrink-0 rounded-md border p-1.5 text-left transition-all duration-200 ${
                                active
                                  ? "border-brass bg-brass/10 shadow-[0_0_0_1px_rgba(217,164,65,0.5)]"
                                  : "border-line bg-night hover:-translate-y-0.5 hover:border-line2"
                              }`}
                            >
                              <div className="aspect-[2/3] w-full overflow-hidden rounded-[3px] bg-raise">
                                {m.coverId ? (
                                  <img
                                    src={olCover(m.coverId, "M")}
                                    alt={`Capa de ${m.title}`}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-line2">
                                    <IconBookOpen size={20} />
                                  </div>
                                )}
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-[10px] font-semibold leading-tight text-paper">
                                {m.title}
                              </p>
                              <p className="line-clamp-1 text-[9px] text-muted">{m.authors[0] ?? "—"}</p>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => applyMatch(idx, it.matches, -1)}
                          className={`flex w-[86px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed p-1.5 transition-all duration-200 ${
                            it.selected === -1
                              ? "border-brass bg-brass/10 text-brass2"
                              : "border-line2 bg-night text-muted hover:border-brass/50 hover:text-paper2"
                          }`}
                        >
                          <IconPencil size={16} />
                          <span className="text-center text-[10px] font-semibold leading-tight">
                            Nenhum desses — manual
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-md border border-line bg-night px-4 py-2.5 text-xs text-muted">
                      Nenhuma correspondência no Open Library — uma capa será gerada localmente.
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_90px]">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Título</label>
                      <input
                        value={it.fields.title}
                        onChange={(e) => patch(idx, { fields: { ...it.fields, title: e.target.value } })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Ano</label>
                      <input
                        value={it.fields.year}
                        onChange={(e) => patch(idx, { fields: { ...it.fields, year: e.target.value } })}
                        className={inputCls}
                        placeholder="1899"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Autor</label>
                      <input
                        value={it.fields.author}
                        onChange={(e) => patch(idx, { fields: { ...it.fields, author: e.target.value } })}
                        className={inputCls}
                        placeholder="Autor desconhecido"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Editora</label>
                      <input
                        value={it.fields.publisher}
                        onChange={(e) => patch(idx, { fields: { ...it.fields, publisher: e.target.value } })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {it.subjects.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {it.subjects.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-line bg-night px-2.5 py-0.5 text-[10px] text-paper2"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          ))}
        </div>

        {/* rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-night/60 px-6 py-4">
          <p className="font-mono text-[10px] text-muted">
            Metadados &amp; capas: <span className="text-brass2">Open Library API</span> · arquivos ficam no seu navegador
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={phase === "saving"}
              className="rounded-md border border-line bg-night px-4 py-2.5 text-sm text-paper2 transition-colors enabled:hover:border-line2 enabled:hover:text-paper disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={() => void saveAll()}
              disabled={!allReady || phase === "saving"}
              className="inline-flex items-center gap-2 rounded-md bg-brass px-5 py-2.5 text-sm font-bold text-night transition-all enabled:hover:bg-brass2 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === "saving" ? (
                <>
                  <IconSpinner size={14} /> Adicionando {saving}/{items.length}…
                </>
              ) : (
                <>Adicionar à estante</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
