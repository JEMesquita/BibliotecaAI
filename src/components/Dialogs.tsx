import { useEffect, useState, type ReactNode } from "react";
import type { Book, Toast } from "../types";
import { IconAlert, IconCheck, IconInfo, IconX } from "./Icons";

export function ModalShell({
  onClose,
  children,
  wide,
}: {
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="animate-overlayIn fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-deep/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`animate-modalIn my-8 w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-lg border border-line bg-surface shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]`}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalShell onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-ember/40 bg-ember/10 text-ember">
            <IconAlert size={18} />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-paper">{title}</h3>
            <div className="mt-1 text-sm leading-relaxed text-muted">{message}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-line bg-night px-4 py-2 text-sm text-paper2 transition-colors hover:border-line2 hover:text-paper"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md border border-ember/60 bg-ember/15 px-4 py-2 text-sm font-semibold text-ember transition-all hover:bg-ember/25"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function EditBookModal({
  book,
  onSave,
  onClose,
}: {
  book: Book;
  onSave: (updated: Book) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [year, setYear] = useState(book.year ?? "");
  const [publisher, setPublisher] = useState(book.publisher ?? "");
  const [subjects, setSubjects] = useState(book.subjects.join(", "));

  const inputCls =
    "w-full rounded-md border border-line bg-night px-3 py-2 text-sm text-paper outline-none transition-colors placeholder:text-muted/50 focus:border-brass";

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">Ficha catalográfica</p>
          <h3 className="font-display text-lg font-bold text-paper">Editar registro</h3>
        </div>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md border border-line text-paper2 transition-colors hover:border-ember/50 hover:text-ember"
          aria-label="Fechar"
        >
          <IconX size={14} />
        </button>
      </div>
      <form
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSave({
            ...book,
            title: title.trim(),
            author: author.trim(),
            year: year.trim() || undefined,
            publisher: publisher.trim() || undefined,
            subjects: subjects
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 8),
          });
        }}
      >
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted">Título *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_110px]">
          <div>
            <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted">Autor</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted">Ano</label>
            <input value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} placeholder="1899" />
          </div>
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted">Editora</label>
          <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted">
            Assuntos <span className="normal-case text-muted/60">(separados por vírgula)</span>
          </label>
          <input
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            className={inputCls}
            placeholder="Ficção brasileira, Romance"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-night px-4 py-2 text-sm text-paper2 transition-colors hover:border-line2 hover:text-paper"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-brass px-4 py-2 text-sm font-bold text-night transition-all hover:bg-brass2 active:scale-95"
          >
            Salvar ficha
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[min(92vw,340px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toastIn pointer-events-auto flex items-center gap-3 rounded-md border bg-surface/95 px-3.5 py-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur ${
            t.kind === "ok" ? "border-moss/50" : t.kind === "err" ? "border-ember/50" : "border-brass/50"
          }`}
        >
          <span
            className={
              t.kind === "ok" ? "text-moss" : t.kind === "err" ? "text-ember" : "text-brass"
            }
          >
            {t.kind === "ok" ? <IconCheck size={16} /> : t.kind === "err" ? <IconAlert size={16} /> : <IconInfo size={16} />}
          </span>
          <p className="flex-1 text-sm leading-snug text-paper">{t.msg}</p>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-muted transition-colors hover:text-paper"
            aria-label="Fechar aviso"
          >
            <IconX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
