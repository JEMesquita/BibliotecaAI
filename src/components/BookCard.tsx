import { useState } from "react";
import { callNumber, formatBytes, isRead, pct, syncState, type Book } from "../types";
import {
  IconBookOpen,
  IconCloud,
  IconCloudCheck,
  IconCloudOff,
  IconPencil,
  IconSpinner,
  IconStar,
  IconTrash,
} from "./Icons";

export interface BookActions {
  onOpen: (b: Book) => void;
  onToggleFav: (b: Book) => void;
  onEdit: (b: Book) => void;
  onAskDelete: (b: Book) => void;
  onSync: (b: Book) => void;
}

function SyncBadge({ book }: { book: Book }) {
  const s = syncState(book);
  if (s === "local") return null;
  const cls =
    s === "sincronizado"
      ? "border-moss/50 bg-night/80 text-moss"
      : s === "enviando"
        ? "border-brass/50 bg-night/80 text-brass"
        : "border-ember/50 bg-night/80 text-ember";
  const label =
    s === "sincronizado"
      ? `Sincronizado com o WeLib${book.sync?.remoteId ? ` · ${book.sync.remoteId}` : ""}`
      : s === "enviando"
        ? "Enviando ao WeLib…"
        : `Falha ao enviar ao WeLib${book.sync?.error ? ` — ${book.sync.error}` : ""}`;
  return (
    <span
      title={label}
      className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full ring-1 ${cls}`}
    >
      {s === "sincronizado" ? (
        <IconCloudCheck size={13} />
      ) : s === "enviando" ? (
        <IconSpinner size={12} />
      ) : (
        <IconCloudOff size={13} />
      )}
    </span>
  );
}

function Cover({ book, className = "" }: { book: Book; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = book.coverUrl && !broken ? book.coverUrl : book.coverData;
  return (
    <div className={`overflow-hidden bg-raise ${className}`}>
      {src ? (
        <img
          src={src}
          alt={`Capa de ${book.title}`}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-line2">
          <IconBookOpen size={34} />
        </div>
      )}
    </div>
  );
}

function ActionButtons({
  book,
  onToggleFav,
  onEdit,
  onAskDelete,
  onSync,
  subtle,
}: BookActions & { book: Book; subtle?: boolean }) {
  const s = syncState(book);
  return (
    <div
      className={`flex items-center gap-1 ${
        subtle
          ? ""
          : "opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 max-lg:opacity-70"
      }`}
    >
      <button
        title={book.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav(book);
        }}
        className={`grid h-7 w-7 place-items-center rounded-md border border-line bg-night/70 transition-all hover:border-brass/60 hover:text-brass2 ${
          book.favorite ? "text-brass" : "text-paper2"
        }`}
      >
        <span key={String(book.favorite)} className={book.favorite ? "animate-popStar inline-flex" : "inline-flex"}>
          <IconStar size={13} filled={book.favorite} />
        </span>
      </button>
      <button
        title="Editar ficha do livro"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(book);
        }}
        className="grid h-7 w-7 place-items-center rounded-md border border-line bg-night/70 text-paper2 transition-all hover:border-brass/60 hover:text-brass2"
      >
        <IconPencil size={13} />
      </button>
      <button
        title={
          s === "sincronizado"
            ? "Sincronizado com o WeLib — enviar novamente"
            : s === "enviando"
              ? "Enviando ao WeLib…"
              : "Enviar ao WeLib"
        }
        disabled={s === "enviando"}
        onClick={(e) => {
          e.stopPropagation();
          onSync(book);
        }}
        className={`grid h-7 w-7 place-items-center rounded-md border bg-night/70 transition-all disabled:cursor-wait ${
          s === "sincronizado"
            ? "border-moss/40 text-moss hover:border-moss/70"
            : s === "erro"
              ? "border-ember/40 text-ember hover:border-ember/70"
              : "border-line text-paper2 hover:border-brass/60 hover:text-brass2"
        }`}
      >
        {s === "enviando" ? <IconSpinner size={13} /> : <IconCloud size={13} />}
      </button>
      <button
        title="Remover da estante"
        onClick={(e) => {
          e.stopPropagation();
          onAskDelete(book);
        }}
        className="grid h-7 w-7 place-items-center rounded-md border border-line bg-night/70 text-paper2 transition-all hover:border-ember/70 hover:text-ember"
      >
        <IconTrash size={13} />
      </button>
    </div>
  );
}

export function BookCard({ book, index, ...actions }: { book: Book; index: number } & BookActions) {
  const p = pct(book);
  const read = isRead(book);
  return (
    <article className="group animate-fadeUp" style={{ animationDelay: `${Math.min(index, 14) * 45}ms` }}>
      <button
        onClick={() => actions.onOpen(book)}
        className="relative block w-full cursor-pointer text-left"
        aria-label={`Ler ${book.title}`}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[4px] bg-raise shadow-[0_10px_24px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06] transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_26px_44px_-16px_rgba(0,0,0,0.85)] group-hover:ring-brass/40">
          <Cover book={book} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.045]" />
          {/* brilho da lombada */}
          <span className="pointer-events-none absolute inset-y-0 left-0 w-[9%] bg-gradient-to-r from-black/35 to-transparent" />
          <span className="pointer-events-none absolute inset-y-0 left-[9%] w-px bg-white/10" />
          <SyncBadge book={book} />
          {book.favorite && (
            <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-night/80 text-brass ring-1 ring-brass/40">
              <IconStar size={12} filled />
            </span>
          )}
          {/* convite de leitura */}
          <span className="absolute inset-x-0 bottom-3 flex translate-y-2 justify-center opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="rounded-full bg-brass px-3 py-1 text-[11px] font-bold text-night shadow-lg">
              {p > 0 && !read ? `Continuar · ${p}%` : read ? "Reler" : "Ler agora"}
            </span>
          </span>
          {/* progresso */}
          {p > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/45">
              <span
                className={`block h-full transition-all duration-500 ${read ? "bg-moss" : "bg-brass"}`}
                style={{ width: `${p}%` }}
              />
            </span>
          )}
        </div>
      </button>

      {/* prateleira de madeira */}
      <div className="mt-1.5 h-2 rounded-[2px] bg-gradient-to-b from-[#4a3820] via-[#332614] to-[#211809] shadow-[0_6px_10px_-4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)]" />

      <div className="relative mt-2 pr-1">
        <div className="absolute -top-1 right-0 z-10">
          <ActionButtons {...actions} book={book} />
        </div>
        <h3 className="truncate font-display text-[15px] font-semibold leading-snug text-paper" title={book.title}>
          {book.title}
        </h3>
        <p className="truncate text-xs text-muted">{book.author || "Autor desconhecido"}</p>
        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted/80">
          <span>{callNumber(book)}</span>
          <span className="text-line2">·</span>
          <span>{book.pages} p.</span>
          {p > 0 && (
            <>
              <span className="text-line2">·</span>
              <span className={read ? "text-moss" : "text-brass"}>{p}%</span>
            </>
          )}
        </p>
      </div>
    </article>
  );
}

export function BookRow({ book, index, ...actions }: { book: Book; index: number } & BookActions) {
  const p = pct(book);
  const read = isRead(book);
  const status = read
    ? { label: "Lido", cls: "border-moss/40 bg-moss/10 text-moss" }
    : p > 0
      ? { label: `Lendo ${p}%`, cls: "border-brass/40 bg-brass/10 text-brass2" }
      : { label: "Novo", cls: "border-line bg-raise text-paper2" };

  return (
    <div
      className="group animate-fadeUp flex items-center gap-4 px-4 py-3 transition-colors hover:bg-raise/50"
      style={{ animationDelay: `${Math.min(index, 16) * 35}ms` }}
    >
      <button
        onClick={() => actions.onOpen(book)}
        className="h-16 w-11 shrink-0 cursor-pointer overflow-hidden rounded-[3px] ring-1 ring-white/10 transition-transform duration-300 hover:scale-105 hover:ring-brass/50"
        aria-label={`Ler ${book.title}`}
      >
        <Cover book={book} className="h-full w-full" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-[15px] font-semibold text-paper">{book.title}</h3>
          {book.favorite && <IconStar size={13} filled className="shrink-0 text-brass" />}
        </div>
        <p className="truncate text-xs text-muted">
          {book.author || "Autor desconhecido"}
          {book.year ? ` · ${book.year}` : ""} · {book.pages} p. · {formatBytes(book.size)}
        </p>
      </div>

      <div className="hidden w-36 shrink-0 md:block">
        <div className="h-1.5 overflow-hidden rounded-full bg-night">
          <div
            className={`h-full rounded-full transition-all duration-500 ${read ? "bg-moss" : "bg-brass"}`}
            style={{ width: `${p}%` }}
          />
        </div>
        <p className="mt-1 font-mono text-[10px] text-muted">
          {p > 0 ? `pág. ${book.progressPage}/${book.pages}` : "não iniciado"}
        </p>
      </div>

      <span className={`hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-block ${status.cls}`}>
        {status.label}
      </span>

      <ActionButtons {...actions} book={book} subtle />
    </div>
  );
}
