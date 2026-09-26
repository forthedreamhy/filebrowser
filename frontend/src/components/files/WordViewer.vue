<template>
  <div class="word-viewer preview-viewer">
    <div v-if="loadError" class="preview-load-error">
      <i class="material-icons">error_outline</i>
      <span>{{ loadError }}</span>
    </div>
    <!-- Word/WPS "另存为网页" 导出的 HTML 伪 .doc,按文档排版渲染。 -->
    <div v-else-if="htmlDocHtml !== ''" class="html-doc-stage">
      <div class="html-doc-page" v-html="htmlDocHtml"></div>
    </div>
    <FileViewer
      v-else-if="file !== null"
      :file="file"
      :name="name"
      :options="options"
    />
    <div v-else class="loading delayed">
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FileViewer } from "@file-viewer/vue3";
import "@file-viewer/vue3/dist/file-viewer3.css";
import wordRenderer from "@file-viewer/renderer-word";

import type { FileViewerOptions } from "@file-viewer/vue3";
import { useFileViewerBuffer } from "@/composables/useFileViewerBuffer";
import {
  decodeDocumentText,
  looksLikeHtmlDocument,
  sanitizeWordExportedHtml,
} from "@/utils/wordExportedHtml";
import { getTheme } from "@/utils/theme";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();
const { file, loadError, name } = useFileViewerBuffer();

// 以 HTML 形式导出却保留 .doc 扩展名的文件,按净化后的富文本排版展示,
// 否则交给 OLE 二进制解析器的 FileViewer 正常路径。
const htmlDocHtml = computed(() => {
  if (file.value === null || !looksLikeHtmlDocument(file.value)) {
    return "";
  }
  return sanitizeWordExportedHtml(decodeDocumentText(file.value));
});

// The renderer-word package types its handler against HTMLDivElement, which the
// renderer input's HTMLElement-based variance rejects; the runtime contract is
// the documented one, so bridge it with a single assertion.
const renderers = wordRenderer as FileViewerOptions["renderers"];

const options = computed<FileViewerOptions>(() => ({
  rendererMode: "replace",
  renderers,
  theme: getTheme() === "dark" ? "dark" : "light",
  locale: locale.value === "zh-cn" ? "zh-CN" : "en-US",
  // Scale document pages to the container width so wide tables remain readable.
  fit: "width",
  // Render into the light DOM so we can override the scrollbar styling.
  styleIsolation: "none",
}));
</script>

<style scoped>
/* HTML 伪 .doc 的纸张排版:单一白色页面居中,内容按 Word 导出的内联样式呈现。 */
.html-doc-stage {
  width: 100%;
  min-height: 100%;
  padding: 32px 24px 48px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.html-doc-page {
  width: 100%;
  max-width: 794px;
  background: #fff;
  color: #1f2328;
  padding: clamp(24px, 7%, 96px) clamp(20px, 6%, 88px);
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 12px 32px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  min-height: 1123px;
  overflow-wrap: anywhere;
}

.html-doc-page table {
  width: auto;
  max-width: 100%;
  border-collapse: collapse;
}

.html-doc-page td,
.html-doc-page th {
  padding: 4px 6px;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.html-doc-page img {
  max-width: 100%;
  height: auto;
}
</style>
