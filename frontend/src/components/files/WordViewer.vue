<template>
  <div class="word-viewer">
    <div v-if="loadError" class="load-error">
      <i class="material-icons">error_outline</i>
      <span>{{ loadError }}</span>
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
import { getTheme } from "@/utils/theme";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();
const { file, loadError, name } = useFileViewerBuffer();

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
.word-viewer {
  width: 100%;
  height: 100%;
  overflow: auto;
  text-align: left;
  /* Push the viewer below the app's transparent header bar (4em). */
  padding-top: 4em;
  box-sizing: border-box;
}

.load-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 0.5em;
  color: var(--fg);
}

.load-error i {
  font-size: 3em;
}
</style>

<!-- 非 scoped:viewer 以 styleIsolation=none 渲染进 light DOM,滚动条才能被覆盖 -->
<style>
.word-viewer ::-webkit-scrollbar,
.presentation-viewer ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.word-viewer ::-webkit-scrollbar-track,
.presentation-viewer ::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.15);
  border-radius: 5px;
}

.word-viewer ::-webkit-scrollbar-thumb,
.presentation-viewer ::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.55);
  border-radius: 5px;
}

.word-viewer ::-webkit-scrollbar-thumb:hover,
.presentation-viewer ::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.85);
}

.word-viewer,
.presentation-viewer {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.55) rgba(128, 128, 128, 0.15);
}
</style>
