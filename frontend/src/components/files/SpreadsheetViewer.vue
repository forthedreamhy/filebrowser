<template>
  <div class="spreadsheet-viewer preview-viewer">
    <div v-if="loadError" class="preview-load-error">
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
