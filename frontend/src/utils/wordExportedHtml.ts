import createDOMPurify from "dompurify";

// Word / WPS 的“另存为网页(单个文件网页)”会把文档导出成 HTML 却保留 .doc
// 扩展名。这类文件不是 OLE 二进制结构,@file-viewer/doc 解析器无法处理,
// 因此按富 HTML 渲染。Word 的排版信息几乎全在内联 style 与 <style> 块里,
// 所以这里不能沿用 renderer-text 的净化器(它禁用了 style),改为用
// DOMPurify 默认配置自行净化:保留 style,剔除脚本与危险嵌入元素。
const FORBID_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "base",
  "form",
  "template",
  "link",
  "meta",
  // <style> 必须禁用:净化后的内容通过 v-html 进入 light DOM,文档内的
  // style 规则会作用于整个应用页面,而不仅仅是我们这一块纸张容器。
  // Word 的关键排版以内联 style 属性为主,仍在保留。
  "style",
];

const FORBID_ATTR = ["action", "formaction", "srcdoc"];

export function sanitizeWordExportedHtml(html: string): string {
  const purifier = createDOMPurify(window);
  if (!purifier.isSupported) {
    // 净化器不可用时按纯文本回退,确保不会渲染未经净化的标记。
    const escape = document.createElement("div");
    escape.textContent = html;
    return escape.innerHTML;
  }

  const fragment = purifier.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: true },
    FORBID_TAGS,
    FORBID_ATTR,
  });

  const host = document.createElement("div");
  host.appendChild(fragment);
  return host.innerHTML;
}

// 判断 .doc/.dot 文件是否实为 HTML 导出。只看文件头,避免全量解码;
// 兼容 UTF-16 BOM 与前置 XML 声明的导出格式。
const HTML_SNIFF_LIMIT = 4096;

export function looksLikeHtmlDocument(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) {
    return false;
  }

  const head = new Uint8Array(
    buffer,
    0,
    Math.min(buffer.byteLength, HTML_SNIFF_LIMIT)
  );
  const utf16le = head[0] === 0xff && head[1] === 0xfe;
  const utf16be = head[0] === 0xfe && head[1] === 0xff;
  const text = stripBom(
    new TextDecoder(
      utf16le ? "utf-16le" : utf16be ? "utf-16be" : "utf-8"
    ).decode(head)
  ).trimStart();

  return (
    /^<!doctype\s+html[\s>]/i.test(text) ||
    /^<html[\s>]/i.test(text) ||
    (/^<\?xml\b/i.test(text) && /<html[\s>]/i.test(text))
  );
}

export function decodeDocumentText(buffer: ArrayBuffer): string {
  const head = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 2));
  const utf16le = head[0] === 0xff && head[1] === 0xfe;
  const utf16be = head[0] === 0xfe && head[1] === 0xff;
  return stripBom(
    new TextDecoder(
      utf16le ? "utf-16le" : utf16be ? "utf-16be" : "utf-8"
    ).decode(buffer)
  );
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
