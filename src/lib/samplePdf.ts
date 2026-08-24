/** Gera um PDF válido (multi-página) inteiramente no cliente — usado no livro de exemplo. */

function ascii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(s: string, width: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > width && cur) {
      out.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export interface SamplePdfOptions {
  title: string;
  author: string;
  paragraphs: string[];
  pages: number;
}

export function buildSamplePdf(opts: SamplePdfOptions): Blob {
  const enc = new TextEncoder();
  const title = ascii(opts.title);
  const author = ascii(opts.author);

  const body: string[] = [];
  for (const p of opts.paragraphs) {
    body.push(...wrap(ascii(p), 88), "");
  }
  while (body.length < opts.pages * 34) body.push(...body.slice(0, opts.pages * 34 - body.length) , "");

  const objs: string[] = [];
  const kids = Array.from({ length: opts.pages }, (_, p) => 4 + p * 2);
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Count ${opts.pages} /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] >>`);
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  for (let p = 0; p < opts.pages; p++) {
    const contentNum = 5 + p * 2;
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`
    );
    const slice = body.slice(p * 34, (p + 1) * 34);
    let ops = `BT /F1 9 Tf 498 42 Td (${p + 1} / ${opts.pages}) Tj ET\n`;
    ops += `BT /F1 20 Tf 64 780 Td (${esc(title)}) Tj ET\n`;
    ops += `BT /F1 11 Tf 64 757 Td (${esc(author)}) Tj ET\n`;
    ops += `0.85 0.64 0.25 RG 1.1 w 64 742 m 531 742 l S\n`;
    ops += `BT /F1 10.5 Tf 16 TL 64 714 Td\n`;
    for (const line of slice) ops += `(${esc(line)}) Tj T*\n`;
    ops += "ET";
    const len = enc.encode(ops).length;
    objs.push(`<< /Length ${len} >>\nstream\n${ops}\nendstream`);
  }

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((bodyStr, i) => {
    offsets.push(enc.encode(out).length);
    out += `${i + 1} 0 obj\n${bodyStr}\nendobj\n`;
  });
  const xrefPos = enc.encode(out).length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return new Blob([out], { type: "application/pdf" });
}

export function domCasmurroSample(): File {
  const paragraphs = [
    "Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheco de vista e de chapeu. Cumprimentou-me, sentou-se ao pe de mim, falou da Lua e dos ministros, e acabou recitando-me versos. A viagem era curta, e os versos pode ser que nao fossem inteiramente maus. Sucedeu, porem, que, como eu estava cansado, fechei os olhos tres ou quatro vezes; tanto bastou para que ele interrompesse a leitura e metesse os versos no bolso.",
    "Continue, disse eu acordando. Ja acabei, murmurou ele. Sao muito bonitos. Vi-lhe fazer um gesto para tira-los outra vez do bolso, mas nao passou do gesto; estava amuado. No dia seguinte entrou a dizer de mim nomes feios, e acabou alcunhando-me Dom Casmurro. Os vizinhos, que nao gostam dos meus habitos reclusos e calados, deram curso a alcunha, que afinal pegou.",
    "Nao consultes dicionarios. Casmurro nao esta aqui no sentido que eles lhe dao, mas no que lhe pos o vulgo de homem calado e metido consigo. Dom veio por ironia, para atribuir-me fumos de fidalgo. Tudo por estar cochilando! Tambem nao achei melhor titulo para a minha narracao; se nao tiver outro daqui ate ao fim do livro, vai este mesmo. O meu poeta do trem ficara sabendo que nao lhe guardo rancor.",
    "Agora que expliquei o titulo, passo a escrever o livro. Antes disso, porem, digamos os motivos que me poem a pena na mao. Vivo so, com um criado. A casa em que moro e propria; fi-la construir de proposito, levado de um desejo tao particular que me vexa imprimi-lo, mas va la. Um dia, ha bastantes anos, lembrou-me reproduzir no Engenho Novo a casa em que me criei na antiga Rua de Matacavalos.",
    "Era um proposito velho, quase uma promessa feita a mim mesmo, dar-lhe o mesmo aspecto. Nao me lembrava bem da casa, mas o jardim e o quintal tinham uma feicao que o tempo nao levou. Quis restaurar tudo para esquecer-me de mim e do resto. O jardim, a fonte, a cascata, o tanque, o banco de pedra, as arvores antigas, tudo esta ali, posto que mudado ou novo.",
    "O fim evidente era atar as duas pontas da vida, e restaurar na velhice a adolescencia. Pois, senhor, nao consegui recompor o que foi nem o que fui. Em tudo, se o rosto e igual, a fisionomia e diferente. Se so me faltassem os outros, vá; um homem consola-se mais ou menos das pessoas que perde; mas falto eu mesmo, e esta lacuna e tudo.",
    "Quando me perguntam por que nao escrevo memorias de uma vida inteira, respondo que nao ha materia: um homem que viveu entre livros e entre ruas pouco guarda de si. Ha, contudo, uma historia que me persegue, e e por ela que pego. Se a memoria me trair, paciencia: as memorias sao sempre um pouco inventadas, e ninguem escreve senao para se defender do esquecimento.",
    "Denunciarei agora uma circunstancia que ainda ninguem sabe. A leitora, que e minha amiga e abriu este livro com o fim de descansar da cavatina de ontem para o baile de hoje, quer fechar as paginas as pressas, ao perceber que vai ser narrada uma historia de amor. Nao faca isso; e um capitulo curto, e depois vem outro, que e de um caso de consciencia.",
  ];
  const blob = buildSamplePdf({
    title: "Dom Casmurro",
    author: "Machado de Assis",
    paragraphs,
    pages: 6,
  });
  return new File([blob], "Dom Casmurro - Machado de Assis.pdf", { type: "application/pdf" });
}
