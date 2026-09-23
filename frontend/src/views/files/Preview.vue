<template>
  <div
    id="previewer"
    @touchmove.prevent.stop
    @wheel="onWheel"
    @mousemove="toggleNavigation"
    @touchstart="toggleNavigation"
  >
    <header-bar v-if="showHeader" transparent>
      <action icon="close" :label="$t('buttons.close')" @action="close()" />
      <title>{{ name }}</title>
      <action
        :disabled="layoutStore.loading"
        v-if="isResizeEnabled && fileStore.req?.type === 'image'"
        :icon="fullSize ? 'photo_size_select_large' : 'hd'"
        @action="toggleSize"
      />

      <template #actions>
        <action
          :disabled="layoutStore.loading"
          v-if="authStore.user?.perm.rename"
          icon="mode_edit"
          :label="$t('buttons.rename')"
          show="rename"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="isCsv && authStore.user?.perm.modify"
          icon="edit_note"
          :label="t('buttons.editAsText')"
          @action="editAsText"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="isMarkdown && authStore.user?.perm.modify"
          icon="edit_note"
          :label="t('buttons.editAsText')"
          @action="editAsText"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="authStore.user?.perm.delete"
          icon="delete"
          :label="$t('buttons.delete')"
          @action="deleteFile"
          id="delete-button"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="authStore.user?.perm.download"
          icon="file_download"
          :label="$t('buttons.download')"
          @action="download"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="
            ['image', 'audio', 'video'].includes(fileStore.req?.type || '') &&
            authStore.user?.perm.download
          "
          icon="open_in_new"
          :label="t('buttons.openDirect')"
          @action="openDirect"
        />
        <action
          :disabled="layoutStore.loading"
          icon="info"
          :label="$t('buttons.info')"
          show="info"
        />
      </template>
    </header-bar>

    <div class="loading delayed" v-if="layoutStore.loading">
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>
    <template v-else>
      <div class="preview">
        <div v-if="isEpub" class="epub-reader">
          <vue-reader
            :location="location"
            :url="previewUrl"
            :get-rendition="getRendition"
            :epubInitOptions="{
              requestCredentials: true,
            }"
            :epubOptions="{
              allowPopups: true,
            }"
            @update:location="locationChange"
          />
          <div class="size">
            <button
              @click="changeSize(Math.max(100, size - 10))"
              class="reader-button"
            >
              <i class="material-icons">remove</i>
            </button>
            <button
              @click="changeSize(Math.min(150, size + 10))"
              class="reader-button"
            >
              <i class="material-icons">add</i>
            </button>
            <span>{{ size }}%</span>
          </div>
        </div>
        <CsvViewer v-else-if="isCsv" :content="csvContent" :error="csvError" />
        <ExtendedImage
          v-else-if="fileStore.req?.type == 'image'"
          :src="previewUrl"
        />
        <audio
          v-else-if="fileStore.req?.type == 'audio'"
          ref="player"
          :src="previewUrl"
          controls
          :autoplay="autoPlay"
          @play="autoPlay = true"
        ></audio>
        <VideoPlayer
          v-else-if="fileStore.req?.type == 'video'"
          ref="player"
          :source="previewUrl"
          :subtitles="subtitles"
          :options="videoOptions"
        >
        </VideoPlayer>
        <object v-else-if="isPdf" class="pdf" :data="previewUrl"></object>
        <PresentationViewer v-else-if="isPptx" />
        <WordViewer v-else-if="isDocx" />
        <SpreadsheetViewer v-else-if="isXlsx" />
        <ArchiveViewer v-else-if="isArchive" />
        <MarkdownViewer v-else-if="isMarkdown" />
        <div v-else-if="fileStore.req?.type == 'blob'" class="info">
          <div class="title">
            <i class="material-icons">feedback</i>
            {{ $t("files.noPreview") }}
          </div>
          <div>
            <a target="_blank" :href="downloadUrl" class="button button--flat">
              <div>
                <i class="material-icons">file_download</i
                >{{ $t("buttons.download") }}
              </div>
            </a>
            <a
              target="_blank"
              :href="previewUrl"
              class="button button--flat"
              v-if="!fileStore.req?.isDir"
            >
              <div>
                <i class="material-icons">open_in_new</i
                >{{ $t("buttons.openFile") }}
              </div>
            </a>
          </div>
        </div>
      </div>
    </template>

    <button
      @click="prev"
      @mouseover="hoverNav = true"
      @mouseleave="hoverNav = false"
      :class="{ hidden: !hasPrevious || !showNav }"
      :aria-label="$t('buttons.previous')"
      :title="$t('buttons.previous')"
    >
      <i class="material-icons">chevron_left</i>
    </button>
    <button
      @click="next"
      @mouseover="hoverNav = true"
      @mouseleave="hoverNav = false"
      :class="{ hidden: !hasNext || !showNav }"
      :aria-label="$t('buttons.next')"
      :title="$t('buttons.next')"
    >
      <i class="material-icons">chevron_right</i>
    </button>
    <link rel="prefetch" :href="previousRaw" />
    <link rel="prefetch" :href="nextRaw" />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";

import { files as api } from "@/api";
import { createURL } from "@/api/utils";
import { resizePreview } from "@/utils/constants";
import url from "@/utils/url";
import { throttle } from "lodash-es";
import HeaderBar from "@/components/header/HeaderBar.vue";
import Action from "@/components/header/Action.vue";
import ExtendedImage from "@/components/files/ExtendedImage.vue";
import VideoPlayer from "@/components/files/VideoPlayer.vue";
import CsvViewer from "@/components/files/CsvViewer.vue";
// Lazy-loaded so the presentation parsing engine stays out of the main bundle.
const PresentationViewer = defineAsyncComponent(
  () => import("@/components/files/PresentationViewer.vue")
);
// Lazy-loaded so the word parsing engine stays out of the main bundle.
const WordViewer = defineAsyncComponent(
  () => import("@/components/files/WordViewer.vue")
);
// Lazy-loaded so the spreadsheet parsing engine stays out of the main bundle.
const SpreadsheetViewer = defineAsyncComponent(
  () => import("@/components/files/SpreadsheetViewer.vue")
);
// Lazy-loaded so the archive parsing engine stays out of the main bundle.
const ArchiveViewer = defineAsyncComponent(
  () => import("@/components/files/ArchiveViewer.vue")
);
// Lazy-loaded so the markdown parser stays out of the main bundle.
const MarkdownViewer = defineAsyncComponent(
  () => import("@/components/files/MarkdownViewer.vue")
);
import { VueReader } from "vue-reader";
import {
  computed,
  defineAsyncComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Rendition } from "epubjs";
import { getTheme } from "@/utils/theme";
import { useI18n } from "vue-i18n";

// CSV file size limit for preview (5MB)
// Prevents browser memory issues with large files
const CSV_MAX_SIZE = 5 * 1024 * 1024;

// Presentation file size limit for preview (50MB)
// Prevents browser memory issues with large files
const PPTX_MAX_SIZE = 50 * 1024 * 1024;
// Only the OpenXML family goes through the pptx engine; legacy .ppt would
// require a separately licensed WASM renderer and stays download-only.
const PPTX_EXTENSIONS = [".pptx", ".ppsx", ".potx", ".pptm", ".ppsm", ".potm"];

// Word document file size limit for preview (50MB)
// Prevents browser memory issues with large files
const DOCX_MAX_SIZE = 50 * 1024 * 1024;
const DOCX_EXTENSIONS = [".docx", ".docm", ".dotx", ".dotm"];

// Spreadsheet file size limit for preview (50MB)
// Prevents browser memory issues with large files
const XLSX_MAX_SIZE = 50 * 1024 * 1024;
const XLSX_EXTENSIONS = [".xlsx", ".xls", ".xlsm", ".xlsb", ".ods"];

// Archive file size limit for preview (50MB)
// Prevents browser memory issues with large files
const ARCHIVE_MAX_SIZE = 50 * 1024 * 1024;
const ARCHIVE_EXTENSIONS = [".zip", ".rar", ".7z", ".tar", ".gz", ".tgz"];

// Markdown file size limit for preview (5MB)
// Prevents browser memory issues with large files
const MD_MAX_SIZE = 5 * 1024 * 1024;
const MD_EXTENSIONS = [".md", ".markdown"];

const location = useStorage("book-progress", 0, undefined, {
  serializer: {
    read: (v) => JSON.parse(v),
    write: (v) => JSON.stringify(v),
  },
});
const size = useStorage("book-size", 120, undefined, {
  serializer: {
    read: (v) => JSON.parse(v),
    write: (v) => JSON.stringify(v),
  },
});

const locationChange = (epubcifi: number) => {
  location.value = epubcifi;
};
let rendition: Rendition | null = null;
const changeSize = (val: number) => {
  size.value = val;
  rendition?.themes.fontSize(`${val}%`);
};

const getRendition = (_rendition: Rendition) => {
  rendition = _rendition;
  switch (getTheme()) {
    case "dark": {
      rendition.themes.override("color", "rgba(255, 255, 255, 0.6)");
      break;
    }
    case "light": {
      rendition.themes.override("color", "rgb(111, 111, 111)");
      break;
    }
  }
  rendition.themes.registerRules("h2Transparent", {
    "h1,h2,h3,h4": {
      "background-color": "transparent !important",
    },
  });
  rendition?.themes.fontSize(`${size.value}%`);
  rendition.themes.select("h2Transparent");
  rendition.themes.override("background-color", "transparent", true);
};

const mediaTypes: ResourceType[] = ["image", "video", "audio", "blob"];

const previousLink = ref<string>("");
const nextLink = ref<string>("");
const listing = ref<ResourceItem[] | null>(null);
const name = ref<string>("");
const fullSize = ref<boolean>(false);
const showNav = ref<boolean>(true);
const navTimeout = ref<null | number>(null);
const hoverNav = ref<boolean>(false);
const autoPlay = ref<boolean>(false);
const previousRaw = ref<string>("");
const nextRaw = ref<string>("");
const csvContent = ref<ArrayBuffer | string>("");
const csvError = ref<string>("");

const player = ref<HTMLVideoElement | HTMLAudioElement | null>(null);

const $showError = inject<IToastError>("$showError")!;

const authStore = useAuthStore();
const fileStore = useFileStore();
const layoutStore = useLayoutStore();

const { t } = useI18n();

const route = useRoute();
const router = useRouter();

const hasPrevious = computed(() => previousLink.value !== "");

const hasNext = computed(() => nextLink.value !== "");

const downloadUrl = computed(() =>
  fileStore.req ? api.getDownloadURL(fileStore.req, false) : ""
);

const directUrl = computed(() =>
  fileStore.req ? api.getDownloadURL(fileStore.req, true) : ""
);

const previewUrl = computed(() => {
  if (!fileStore.req) {
    return "";
  }

  if (fileStore.req.type === "image" && !fullSize.value) {
    return api.getPreviewURL(fileStore.req, "big");
  }

  if (isEpub.value) {
    return createURL("api/raw" + fileStore.req.path, {});
  }

  return api.getDownloadURL(fileStore.req, true);
});

const isPdf = computed(() => fileStore.req?.extension.toLowerCase() == ".pdf");
const isEpub = computed(
  () => fileStore.req?.extension.toLowerCase() == ".epub"
);
const isCsv = computed(
  () =>
    fileStore.req?.extension.toLowerCase() == ".csv" &&
    fileStore.req.size <= CSV_MAX_SIZE
);
const isPptx = computed(
  () =>
    !!fileStore.req &&
    PPTX_EXTENSIONS.includes(fileStore.req.extension.toLowerCase()) &&
    fileStore.req.size <= PPTX_MAX_SIZE
);
const isDocx = computed(
  () =>
    !!fileStore.req &&
    DOCX_EXTENSIONS.includes(fileStore.req.extension.toLowerCase()) &&
    fileStore.req.size <= DOCX_MAX_SIZE
);
const isXlsx = computed(
  () =>
    !!fileStore.req &&
    XLSX_EXTENSIONS.includes(fileStore.req.extension.toLowerCase()) &&
    fileStore.req.size <= XLSX_MAX_SIZE
);
const isArchive = computed(
  () =>
    !!fileStore.req &&
    ARCHIVE_EXTENSIONS.includes(fileStore.req.extension.toLowerCase()) &&
    fileStore.req.size <= ARCHIVE_MAX_SIZE
);
const isMarkdown = computed(
  () =>
    !!fileStore.req &&
    MD_EXTENSIONS.includes(fileStore.req.extension.toLowerCase()) &&
    fileStore.req.size <= MD_MAX_SIZE
);

// 需要显示顶部 header 的预览类型（透明模式）。
const showHeader = computed(
  () =>
    showNav.value ||
    isPdf.value ||
    isEpub.value ||
    isCsv.value ||
    isPptx.value ||
    isDocx.value ||
    isXlsx.value ||
    isArchive.value ||
    isMarkdown.value
);

// 这些查看器自身会消费方向键/Enter（翻页、表格、压缩包列表等），
// 不应再被全局的 prev/next 快捷键截断。
const isInteractiveViewer = computed(
  () => isPptx.value || isDocx.value || isXlsx.value || isArchive.value
);

const isResizeEnabled = computed(() => resizePreview);

const subtitles = computed(() => {
  if (fileStore.req?.subtitles) {
    return api.getSubtitlesURL(fileStore.req);
  }
  return [];
});

const videoOptions = computed(() => {
  return { autoplay: autoPlay.value };
});

watch(route, () => {
  updatePreview();
  toggleNavigation();
});

// Specify hooks
onMounted(async () => {
  window.addEventListener("keydown", key);
  listing.value = fileStore.oldReq?.items ?? null;
  updatePreview();
});

onBeforeUnmount(() => window.removeEventListener("keydown", key));

// Specify methods
const deleteFile = () => {
  layoutStore.showHover({
    prompt: "delete",
    confirm: () => {
      if (listing.value === null) {
        return;
      }

      const index = listing.value.findIndex((item) => item.name == name.value);
      listing.value.splice(index, 1);

      if (hasNext.value) {
        next();
      } else if (!hasPrevious.value && !hasNext.value) {
        const nearbyItem = listing.value[Math.max(0, index - 1)];
        fileStore.preselect = nearbyItem?.path;

        close();
      } else {
        prev();
      }
    },
  });
};

const prev = () => {
  hoverNav.value = false;
  router.replace({ path: previousLink.value });
};

const next = () => {
  hoverNav.value = false;
  router.replace({ path: nextLink.value });
};

const key = (event: KeyboardEvent) => {
  if (layoutStore.currentPrompt !== null) {
    return;
  }
  // 当查看器自身需要消费键盘事件（视频进度、PPT/Word/Excel/压缩包翻页）
  // 时，不要把方向键和 Enter 占用来切换文件。
  const isVideo = fileStore.req?.type === "video";
  const captureNavigation = !isVideo && !isInteractiveViewer.value;
  if (event.which === 13) {
    // enter
    if (captureNavigation && hasNext.value) next();
  } else if (event.which === 39) {
    // right arrow
    if (captureNavigation && hasNext.value) next();
  } else if (event.which === 37) {
    // left arrow
    if (captureNavigation && hasPrevious.value) prev();
  } else if (event.which === 27) {
    // esc
    close();
  }
};
const updatePreview = async () => {
  if (player.value && player.value.paused && !player.value.ended) {
    autoPlay.value = false;
  }

  const dirs = route.fullPath.split("/");
  name.value = decodeURIComponent(dirs[dirs.length - 1]);

  // Load CSV content if it's a CSV file
  if (isCsv.value && fileStore.req) {
    csvContent.value = "";
    csvError.value = "";

    if (fileStore.req.size > CSV_MAX_SIZE) {
      csvError.value = t("files.csvTooLarge");
    } else {
      if (fileStore.req.rawContent != null) {
        csvContent.value = fileStore.req.rawContent;
      } else {
        csvContent.value = fileStore.req.content ?? "";
      }
    }
  }

  if (!listing.value) {
    try {
      const path = url.removeLastDir(route.path);
      const res = await api.fetch(path);
      listing.value = res.items;
    } catch (e: any) {
      $showError(e);
    }
  }

  previousLink.value = "";
  nextLink.value = "";
  if (listing.value) {
    for (let i = 0; i < listing.value.length; i++) {
      if (listing.value[i].name !== name.value) {
        continue;
      }

      for (let j = i - 1; j >= 0; j--) {
        if (mediaTypes.includes(listing.value[j].type)) {
          previousLink.value = listing.value[j].url;
          previousRaw.value = prefetchUrl(listing.value[j]);
          break;
        }
      }
      for (let j = i + 1; j < listing.value.length; j++) {
        if (mediaTypes.includes(listing.value[j].type)) {
          nextLink.value = listing.value[j].url;
          nextRaw.value = prefetchUrl(listing.value[j]);
          break;
        }
      }

      return;
    }
  }
};

const prefetchUrl = (item: ResourceItem) => {
  if (item.type !== "image") {
    return "";
  }

  return fullSize.value
    ? api.getDownloadURL(item, true)
    : api.getPreviewURL(item, "big");
};

const toggleSize = () => (fullSize.value = !fullSize.value);

const toggleNavigation = throttle(function () {
  showNav.value = true;

  if (navTimeout.value) {
    clearTimeout(navTimeout.value);
  }

  navTimeout.value = window.setTimeout(() => {
    showNav.value = false || hoverNav.value;
    navTimeout.value = null;
  }, 1500);
}, 500);

const close = () => {
  const uri = url.removeLastDir(route.path) + "/";
  router.push({ path: uri });
};

const onWheel = (event: WheelEvent) => {
  // Let document/presentation/spreadsheet/archive/markdown viewers handle
  // their own scroll; prevent the browser gesture for everything else.
  if (
    isPptx.value ||
    isDocx.value ||
    isXlsx.value ||
    isArchive.value ||
    isMarkdown.value
  ) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
};

const download = () => window.open(downloadUrl.value);
const openDirect = () => window.open(directUrl.value);

const editAsText = () => {
  router.push({ path: route.path, query: { edit: "true" } });
};
</script>
