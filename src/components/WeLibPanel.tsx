import { isWeLibReady, type WeLibConfig, type WeLibResult } from "../lib/welib";
import { IconAlert, IconCheck, IconCloud, IconGear, IconServer, IconSpinner, IconSync } from "./Icons";

interface Props {
  config: WeLibConfig;
  total: number;
  synced: number;
  pending: number;
  testing: boolean;
  testResult: WeLibResult | null;
  syncingAll: boolean;
  onTest: () => void;
  onSettings: () => void;
  onSyncAll: () => void;
}

export default function WeLibPanel({
  config,
  total,
  synced,
  pending,
  testing,
  testResult,
  syncingAll,
  onTest,
  onSettings,
  onSyncAll,
}: Props) {
  const ready = isWeLibReady(config);
  const mode = config.demo ? "demonstração" : ready ? "servidor próprio" : "desconectado";
  const pctSynced = total > 0 ? Math.round((synced / total) * 100) : 0;

  return (
    <aside className="overflow-hidden rounded-lg border border-line bg-surface/70">
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-line px-5 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">Integração WeLib</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
            config.demo
              ? "border-brass/50 bg-brass/10 text-brass2"
              : ready
                ? "border-moss/50 bg-moss/10 text-moss"
                : "border-line bg-night text-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              config.demo ? "animate-pulse bg-brass" : ready ? "bg-moss" : "bg-line2"
            }`}
          />
          {mode}
        </span>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-night text-brass">
            <IconServer size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-paper">
              {config.demo ? "Servidor demo embutido" : ready ? "Servidor WeLib da instituição" : "Nenhum servidor"}
            </p>
            <p className="truncate font-mono text-[11px] text-muted" title={config.demo ? "" : config.baseUrl}>
              {config.demo ? "simulação local · sem credenciais" : ready ? config.baseUrl : "configure para ativar o envio"}
            </p>
          </div>
        </div>

        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-[11px] leading-relaxed ${
              testResult.ok
                ? "border-moss/40 bg-moss/10 text-moss"
                : "border-ember/40 bg-ember/10 text-ember"
            }`}
          >
            {testResult.ok ? <IconCheck size={13} className="mt-0.5 shrink-0" /> : <IconAlert size={13} className="mt-0.5 shrink-0" />}
            <span>
              {testResult.message}
              {testResult.status ? <span className="opacity-70"> (HTTP {testResult.status})</span> : null}
            </span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
            <span>Volumes no WeLib</span>
            <span className={synced > 0 ? "text-brass2" : ""}>
              {synced}/{total}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-night">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brassdim to-brass transition-all duration-700"
              style={{ width: `${pctSynced}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSyncAll}
            disabled={!ready || pending === 0 || syncingAll}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-brass px-3 text-xs font-bold text-night transition-all enabled:hover:bg-brass2 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {syncingAll ? <IconSpinner size={13} /> : <IconSync size={13} />}
            {syncingAll ? "Sincronizando…" : `Sincronizar ${pending} pendente${pending === 1 ? "" : "s"}`}
          </button>
          <button
            onClick={onTest}
            disabled={!ready || testing}
            title="Testar conexão com o WeLib"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-night px-3 text-xs font-semibold text-paper2 transition-colors enabled:hover:border-brass/50 enabled:hover:text-brass2 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {testing ? <IconSpinner size={13} /> : <IconCloud size={13} />}
            Testar
          </button>
          <button
            onClick={onSettings}
            title="Configurar a API WeLib"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-night text-paper2 transition-all hover:rotate-45 hover:border-brass/50 hover:text-brass2"
          >
            <IconGear size={14} />
          </button>
        </div>

        <p className="font-mono text-[10px] leading-relaxed text-muted/80">
          O envio publica o PDF e a ficha catalográfica em <span className="text-paper2">POST /items</span>; a busca de
          edições usa <span className="text-paper2">GET /search</span>.
        </p>
      </div>
    </aside>
  );
}
