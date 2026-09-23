<template>
  <div class="spreadsheet-viewer">
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
import spreadsheetRenderer from "@file-viewer/renderer-spreadsheet";

import type { FileViewerOptions } from "@file-viewer/vue3";
import { useFileViewerBuffer } from "@/composables/useFileViewerBuffer";
import { getTheme } from "@/utils/theme";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();
const { file, loadError, name } = useFileViewerBuffer();

const renderers = spreadsheetRenderer as FileViewerOptions["renderers"];

const options = computed<FileViewerOptions>(() => ({
  rendererMode: "replace",
  renderers,
  theme: getTheme() === "dark" ? "dark" : "light",
  locale: locale.value === "zh-cn" ? "zh-CN" : "en-US",
  fit: "contain",
  styleIsolation: "none",
}));
</script>

<style scoped>
.spreadsheet-viewer {
  width: 100%;
  height: 100%;
  overflow: auto;
  text-align: left;
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

<style>
.spreadsheet-viewer ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.spreadsheet-viewer ::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.15);
  border-radius: 5px;
}

.spreadsheet-viewer ::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.55);
  border-radius: 5px;
}

.spreadsheet-viewer ::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.85);
}

.spreadsheet-viewer {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.55) rgba(128, 128, 128, 0.15);
}
</style>
