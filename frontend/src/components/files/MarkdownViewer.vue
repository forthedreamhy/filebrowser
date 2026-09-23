<template>
  <div class="markdown-viewer">
    <div v-if="loadError" class="load-error">
      <i class="material-icons">error_outline</i>
      <span>{{ loadError }}</span>
    </div>
    <div v-else class="markdown-body" :data-theme="theme" v-html="html"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Marked } from "marked";
import markedKatex from "marked-katex-extension";
import DOMPurify from "dompurify";

import { useFileStore } from "@/stores/file";
import { getTheme } from "@/utils/theme";

const fileStore = useFileStore();

const katexOptions = {
  output: "mathml" as const,
  throwOnError: false,
};
// 使用独立实例，避免污染全局 marked 配置。
const marked = new Marked();
marked.use(markedKatex(katexOptions));

const html = ref("");
const loadError = ref("");

const theme = computed(() => (getTheme() === "dark" ? "dark" : "light"));

const render = async () => {
  const source = fileStore.req?.content ?? "";
  loadError.value = "";

  if (!source) {
    html.value = "";
    return;
  }

  try {
    html.value = DOMPurify.sanitize(await marked.parse(source));
  } catch (e: any) {
    loadError.value = e?.message || "Failed to render markdown";
    html.value = "";
  }
};

watch(() => fileStore.req?.path, render, { immediate: true });
</script>

<style scoped>
.markdown-viewer {
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

<!-- Rendered markdown lives in light DOM, so style it with an unscoped block. -->
<style>
.markdown-viewer .markdown-body {
  padding: 1.5em 2em;
  font-size: 16px;
  line-height: 1.6;
  color: var(--fg);
  background: transparent;
  word-wrap: break-word;
}

.markdown-viewer .markdown-body h1,
.markdown-viewer .markdown-body h2,
.markdown-viewer .markdown-body h3,
.markdown-viewer .markdown-body h4,
.markdown-viewer .markdown-body h5,
.markdown-viewer .markdown-body h6 {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
  color: var(--fg);
}

.markdown-viewer .markdown-body p {
  margin-top: 0;
  margin-bottom: 1em;
}

.markdown-viewer .markdown-body a {
  color: var(--action);
  text-decoration: none;
}

.markdown-viewer .markdown-body a:hover {
  text-decoration: underline;
}

.markdown-viewer .markdown-body code {
  padding: 0.2em 0.4em;
  font-family:
    ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.9em;
  background: rgba(128, 128, 128, 0.15);
  border-radius: 4px;
}

.markdown-viewer .markdown-body pre {
  padding: 1em;
  overflow: auto;
  background: rgba(128, 128, 128, 0.12);
  border-radius: 6px;
}

.markdown-viewer .markdown-body pre code {
  padding: 0;
  background: transparent;
}

.markdown-viewer .markdown-body blockquote {
  margin: 0 0 1em;
  padding: 0 1em;
  color: rgba(128, 128, 128, 0.9);
  border-left: 4px solid rgba(128, 128, 128, 0.4);
}

.markdown-viewer .markdown-body ul,
.markdown-viewer .markdown-body ol {
  margin-top: 0;
  margin-bottom: 1em;
  padding-left: 2em;
}

.markdown-viewer .markdown-body table {
  width: 100%;
  max-width: 100%;
  margin-bottom: 1em;
  border-collapse: collapse;
}

.markdown-viewer .markdown-body th,
.markdown-viewer .markdown-body td {
  padding: 0.5em 1em;
  border: 1px solid rgba(128, 128, 128, 0.3);
}

.markdown-viewer .markdown-body th {
  background: rgba(128, 128, 128, 0.12);
}

.markdown-viewer .markdown-body img {
  max-width: 100%;
  height: auto;
}

.markdown-viewer .markdown-body hr {
  height: 1px;
  margin: 1.5em 0;
  background: rgba(128, 128, 128, 0.4);
  border: none;
}

/* Scrollbar overrides. */
.markdown-viewer ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.markdown-viewer ::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.15);
  border-radius: 5px;
}

.markdown-viewer ::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.55);
  border-radius: 5px;
}

.markdown-viewer ::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.85);
}

.markdown-viewer {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.55) rgba(128, 128, 128, 0.15);
}
</style>
