# Estante — Biblioteca Virtual de PDFs · API WeLib

Biblioteca virtual pessoal para **upload de livros em PDF**, com catalogação automática,
leitor integrado (pdf.js), progresso de leitura salvo página a página e **integração com a
API WeLib** para busca de metadados, capas e sincronização do acervo.

Todo o acervo (arquivos PDF, capas e progresso) é armazenado no navegador via **IndexedDB** —
a hospedagem precisa servir apenas arquivos estáticos. Não há backend próprio, o que torna a
publicação na **Hostinger** (hPanel, FTP ou Git) simples e barata.

---

## 1 · Visão geral

| Camada          | Tecnologia                                    |
| --------------- | --------------------------------------------- |
| Interface       | React 18 + TypeScript + Vite + Tailwind CSS 4 |
| Leitor de PDF   | `pdfjs-dist` (render em canvas)               |
| Armazenamento   | IndexedDB (PDFs, capas, fichas, progresso)    |
| Integração      | Cliente da **API WeLib** (demo embutida ou servidor próprio) |
| Persistência de config | `localStorage` (conexão WeLib)         |
| Hospedagem      | Qualquer hosting estático — guia focado em **Hostinger** |

**Funcionalidades**

- Upload de um ou vários PDFs (botão ou arrastar-e-soltar em qualquer lugar da página)
- Leitura do PDF no navegador: página, zoom, progresso salvo automaticamente
- Catalogação automática: título/autor extraídos do PDF → busca na API WeLib → escolha da edição (capa, editora, ano, assuntos) com fallback de cadastro manual e capa gerada localmente
- Sincronização com o WeLib: envio do PDF + ficha catalográfica (multipart), estado por volume (`local`, `enviando`, `sincronizado`, `erro`), reenvio individual ou em lote, remoção remota ao excluir um volume
- Filtros (todos / favoritos / lendo / lidos / novos), busca com atalho `/`, ordenação, visões em estante e lista
- Painel de status da conexão WeLib com teste de conectividade e contador de volumes sincronizados

---

## 2 · Ambiente virtual (rodando localmente)

### Pré-requisitos

- **Node.js 20 LTS** ou superior — [nodejs.org](https://nodejs.org/) (verifique com `node -v`)
- **npm** (já vem com o Node) — verifique com `npm -v`
- Navegador moderno (Chrome, Edge, Firefox) para IndexedDB e canvas

### Instalação

```bash
# 1. Clone ou baixe o projeto e entre na pasta
cd estante

# 2. Instale as dependências
npm install

# 3. Suba o servidor de desenvolvimento
npm run dev
```

Abra a URL exibida (padrão `http://localhost:5173`). O modo dev tem recarga a quente —
alterações em `src/` aparecem na hora.

### Comandos úteis

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # gera a pasta dist/ para produção
npm run typecheck  # checagem de tipos TypeScript (sem emitir arquivos)
```

### Configuração do WeLib (dentro do app)

A conexão é configurada **no próprio aplicativo**, não no build — por isso o mesmo `dist/`
funciona em qualquer hospedagem sem variáveis de ambiente:

1. Clique no botão **WeLib · demo** no topo (ou em *Configurar* no painel lateral da estante)
2. Escolha um dos modos:
   - **Servidor de demonstração (offline)** — simula a API WeLib localmente; nenhum dado sai do navegador. Ideal para testar a publicação sem credenciais.
   - **Servidor WeLib próprio** — informe a URL base (ex.: `https://minhabiblioteca.exemplo.com/api`), a chave de API e, se aplicável, o identificador da instituição
3. Use **Testar conexão** para validar antes de salvar

> O cliente chama `GET {base}/search`, `POST {base}/items` (multipart), `DELETE {base}/items/{id}`
> e `GET {base}/ping` — veja os detalhes em `src/lib/welib.ts` para adaptar ao seu endpoint.

---

## 3 · Build de produção

```bash
npm run build
```

Resultado na pasta `dist/`:

```
dist/
├── index.html            ← ponto de entrada (SPA)
├── .htaccess             ← regras Apache (já incluído via public/)
└── assets/
    ├── index-*.js        ← bundle da aplicação
    ├── index-*.css       ← estilos
    └── pdf.worker.min-*.mjs  ← worker do pdf.js (necessário ao lado do bundle)
```

> **Importante:** envie **o conteúdo** da pasta `dist/`, e não a pasta `dist` em si.
> O `index.html` precisa ficar na raiz do diretório público.

---

## 4 · Publicando na Hostinger

A Hostinger serve arquivos estáticos em qualquer plano — o plano **Premium/Single** já basta.
Há três caminhos; escolha um.

### Opção A — Gerenciador de Arquivos do hPanel (mais simples)

1. No seu computador, rode `npm run build`
2. **Compacte** o conteúdo de `dist/` em um `site.zip` (selecionando os arquivos de dentro da pasta, não a pasta `dist`)
3. Acesse [hpanel.hostinger.com](https://hpanel.hostinger.com) → **Sites** → seu domínio → **Gerenciador de Arquivos**
4. Abra a pasta **`public_html`**
   - Se existir um arquivo `default.php` ou `index.html` de exemplo da Hostinger, **delete-o**
5. Clique em **Enviar arquivos (upload)** e envie o `site.zip`
6. Clique com o botão direito sobre o `site.zip` → **Extrair** → confirme a extração dentro de `public_html`
7. Apague o `site.zip` (não é mais necessário)
8. Estrutura final esperada:

```
public_html/
├── index.html
├── .htaccess
├── mockup.html
└── assets/…
```

9. Acesse `https://seudominio.com` — a estante deve carregar

### Opção B — FTP com FileZilla (para quem prefere cliente FTP)

1. hPanel → **Sites** → **Arquivos** → **Contas FTP** → anote *Host FTP*, *Usuário* e *Senha* (porta **21**)
2. Abra o **FileZilla** e conecte com esses dados
3. Navegue até `public_html/` no lado remoto
4. Arraste **o conteúdo** da pasta local `dist/` para `public_html/`
5. Confirme que `index.html` ficou na raiz de `public_html`

### Opção C — Git da Hostinger (planos Business+, atualização contínua)

1. Suba o projeto para um repositório (GitHub/GitLab)
2. hPanel → **Avançado** → **Implantação Git** → conectar repositório
3. Configure:
   - **Branch:** `main`
   - **Build command:** `npm install && npm run build`
   - **Output directory:** `dist`
4. Salve — cada push em `main` publica uma nova versão automaticamente

### Ativar HTTPS (SSL gratuito)

1. hPanel → **Segurança** → **SSL** → **Instalar SSL** (Let's Encrypt gratuito)
2. Aguarde a emissão (alguns minutos) e ative **Forçar HTTPS**
3. Fontes e recursos externos já são carregados via `https`, então nada mais a ajustar

---

## 5 · O arquivo `.htaccess` incluso

O projeto já inclui `public/.htaccess`, copiado para `dist/` no build, com:

- Compressão GZIP para JS/CSS/HTML/SVG
- Cache de navegador para assets imutáveis (`/assets/`)
- Tipos MIME corretos para `.mjs` (worker do pdf.js) e `.wasm`
- Fallback SPA: qualquer rota inexistente serve `index.html`
- Segurança: bloqueio de acesso a arquivos `.env`, `.git` e congêneres

O Apache da Hostinger (LiteSpeed) respeita esse arquivo automaticamente — não há configuração extra no painel.

---

## 6 · Observações de operação

- **Armazenamento por visitante:** cada navegador guarda o próprio acervo em IndexedDB (centenas de MB na prática). Limpar "dados do site" no navegador apaga a biblioteca daquele dispositivo.
- **Nenhum segredo no build:** a chave da API WeLib fica no `localStorage` do usuário, definida pelo painel do app — seguro para hosting estático compartilhado.
- **Atualizações:** rode `npm run build` e republique o conteúdo de `dist/`. Os hashes nos nomes dos assets invalidam o cache antigo automaticamente.
- **CORS:** se apontar para um servidor WeLib próprio em outro domínio, o servidor precisa permitir o domínio publicado (header `Access-Control-Allow-Origin`).

---

## 7 · Solução de problemas

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| Página em branco após publicar | `dist/` enviado como pasta interna (`public_html/dist/index.html`) | Mova o conteúdo de `dist/` para a raiz de `public_html/` |
| "Não foi possível ler este PDF" no upload | PDF corrompido/criptografado | Use a opção *Cadastrar manualmente* ou outro arquivo |
| Erro ao sincronizar com WeLib | Servidor fora do ar, chave inválida ou CORS | Use *Testar conexão* no painel; em último caso, ative o modo demonstração |
| Capas não aparecem | Capa remota indisponível | O app gera capa tipográfica local automaticamente (fallback) |
| 404 em `pdf.worker.min-*.mjs` | Build antigo publicado sem a pasta `assets/` | Republique o conteúdo completo de `dist/` |
| Mudanças não aparecem | Cache do navegador | Atualize com `Ctrl + F5` (o `.htaccess` já cuida do cache de assets) |

---

## 8 · Estrutura do projeto

```
src/
├── App.tsx                  # estante, filtros, painel WeLib, orquestração
├── types.ts                 # Book, WeLibMatch, SyncInfo, utilitários
├── lib/
│   ├── welib.ts             # cliente da API WeLib (demo + servidor real)
│   ├── db.ts                # IndexedDB (livros, PDFs)
│   ├── pdf.ts               # pdf.js: metadados e abertura de documentos
│   ├── cover.ts             # capas tipográficas geradas em canvas
│   └── samplePdf.ts         # PDF de exemplo (Dom Casmurro) para testes
└── components/
    ├── BookCard.tsx         # cartões/linhas da estante + badge de sincronização
    ├── CatalogModal.tsx     # balcão de aquisição: leitura do PDF + busca WeLib
    ├── ReaderModal.tsx      # leitor de PDF com progresso
    ├── WeLibPanel.tsx       # painel de status e sincronização em lote
    ├── Dialogs.tsx          # edição, confirmação, toasts, config do WeLib
    └── Icons.tsx            # ícones SVG inline
```

---

## Licença

Projeto de estudo — uso livre. O leitor usa [pdf.js](https://mozilla.github.io/pdf.js/) (Apache-2.0).
