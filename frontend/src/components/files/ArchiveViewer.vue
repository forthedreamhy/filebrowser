<template>
  <div ref="viewerRoot" class="archive-viewer">
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
import { computed, ref } from "vue";
import { onMounted, onUnmounted } from "vue";
import { FileViewer } from "@file-viewer/vue3";
import "@file-viewer/vue3/dist/file-viewer3.css";
import archiveRenderer from "@file-viewer/renderer-archive";
import wordRenderer from "@file-viewer/renderer-word";
import presentationRenderer from "@file-viewer/renderer-presentation";
import spreadsheetRenderer from "@file-viewer/renderer-spreadsheet";

import type { FileViewerOptions } from "@file-viewer/vue3";
import { useFileViewerBuffer } from "@/composables/useFileViewerBuffer";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();
const { file, loadError, name } = useFileViewerBuffer();
const viewerRoot = ref<HTMLElement | null>(null);

// When no archive entry is selected, the renderer shows an empty-state inside
// .archive-nested-target. Programmatically collapse the preview pane so the
// file list spans the full width, because the :has() CSS rule may be ignored
// in some browsers or shadow-DOM boundaries.
let emptyObserver: MutationObserver | null = null;

const syncEmptyLayout = () => {
  if (!viewerRoot.value) return;

  const shells = viewerRoot.value.querySelectorAll(".archive-shell");
  shells.forEach((shell) => {
    const nested = shell.querySelector(".archive-nested-target");
    const empty = nested?.querySelector(":scope > .archive-empty");
    const preview = shell.querySelector(".archive-preview");
    const shellEl = shell as HTMLElement;
    const previewEl = preview as HTMLElement | null;

    if (empty) {
      // Force the archive shell to fill the viewport area so the file list
      // spans the full width, bypassing any intermediate container width
      // constraints that keep the renderer narrow.
      shellEl.style.position = "absolute";
      shellEl.style.inset = "0";
      shellEl.style.width = "auto";
      shellEl.style.height = "auto";
      shellEl.style.gridTemplateColumns = "1fr";
      if (previewEl) previewEl.style.display = "none";
      // Lock the sidebar open and hide the "Hide archive file list" toggle
      // while no entry is selected, because there is no preview to expand back
      // to and the collapsed sidebar would be impossible to reopen.
      shellEl.classList.add("archive-empty-preview");
    } else {
      shellEl.style.position = "";
      shellEl.style.inset = "";
      shellEl.style.width = "";
      shellEl.style.height = "";
      shellEl.style.gridTemplateColumns = "";
      if (previewEl) previewEl.style.display = "";
      shellEl.classList.remove("archive-empty-preview");
    }
  });
};

// Compose the archive renderer with office renderers so nested .doc/.docx,
// .ppt/.pptx, and .xls/.xlsx entries can be previewed inside the archive.
const renderers = [
  wordRenderer,
  presentationRenderer,
  spreadsheetRenderer,
  archiveRenderer,
] as unknown as FileViewerOptions["renderers"];

const options = computed<FileViewerOptions>(() => ({
  rendererMode: "replace",
  renderers,
  // The File Browser preview overlay is always dark, so force the archive
  // viewer into dark mode so its header and sidebar do not appear bright
  // white against the black preview background.
  theme: "dark",
  // Hide the File Viewer web toolbar (Search/Download/Print/HTML/theme toggle).
  // File Browser already provides a header with download/close/actions, and
  // the archive renderer has its own per-entry preview toolbar.
  toolbar: false,
  locale: locale.value === "zh-cn" ? "zh-CN" : "en-US",
  fit: "contain",
  styleIsolation: "none",
}));

onMounted(() => {
  if (!viewerRoot.value) return;

  emptyObserver = new MutationObserver(() => syncEmptyLayout());
  emptyObserver.observe(viewerRoot.value, { childList: true, subtree: true });
  syncEmptyLayout();
});

onUnmounted(() => {
  emptyObserver?.disconnect();
  emptyObserver = null;
});
</script>

<style scoped>
.archive-viewer {
  position: absolute;
  inset: 0;
  overflow: hidden;
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
.archive-viewer ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.archive-viewer ::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.15);
  border-radius: 5px;
}

.archive-viewer ::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.55);
  border-radius: 5px;
}

.archive-viewer ::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.85);
}

.archive-viewer {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
}

.archive-viewer .ff-file-viewer-vue3,
.archive-viewer .file-viewer {
  flex: 1 1 100% !important;
  align-self: stretch !important;
  width: 100% !important;
  min-width: 0 !important;
}

.archive-viewer,
.archive-viewer .ff-file-viewer-vue3,
.archive-viewer .file-viewer,
.archive-viewer .viewer-stage,
.archive-viewer .viewer-content-shell,
.archive-viewer .content,
.archive-viewer .file-render,
.archive-viewer .file-render-host,
.archive-viewer .archive-shell {
  width: 100% !important;
}

.archive-viewer {
  --archive-sidebar-track: clamp(280px, 35%, 480px);
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.55) rgba(128, 128, 128, 0.15);
}

/* When no file is selected, the preview pane only contains the empty-state
   placeholder inside .archive-nested-target. Hide that pane and let the file
   list span the full width. */
.archive-shell:has(.archive-nested-target > .archive-empty) {
  grid-template-columns: 1fr !important;
}

.archive-shell:has(.archive-nested-target > .archive-empty) .archive-preview {
  display: none !important;
}

/* When no archive entry is selected, lock the sidebar open and hide the
   "Hide archive file list" button; collapsing it would leave no preview pane
   to expand from, so the user could not bring the list back. */
.archive-shell.archive-empty-preview .archive-head .archive-sidebar-toggle {
  display: none !important;
}

/* Hide the File Viewer web toolbar inside zip preview. File Browser already
   provides its own header with download/close/actions, and the white toolbar
   clashes with the dark preview overlay. */
.archive-viewer .file-viewer-web-toolbar {
  display: none !important;
}

/* The archive renderer assigns a light-grey background to .archive-viewer,
   which is our outer container and sits behind the transparent preview header.
   Use a consistent dark slate so the header blends and the preview is not
   pitch-black against the overlay. */
.archive-viewer {
  background: rgb(32, 41, 47) !important;
}
</style>
