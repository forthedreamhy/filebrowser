import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { fetchURL } from "@/api/utils";
import { useFileStore } from "@/stores/file";

// 为 FileViewer 系列预览组件统一拉取原始文件 Buffer。
// 组件只需要关心渲染器与配置，文件加载、错误处理、文件名同步都在这里完成。
export function useFileViewerBuffer() {
  const fileStore = useFileStore();
  const { t } = useI18n();

  const file = ref<ArrayBuffer | null>(null);
  const loadError = ref("");

  const name = computed(() => fileStore.req?.name ?? "");

  const load = async () => {
    file.value = null;
    loadError.value = "";

    const req = fileStore.req;
    if (!req || req.isDir) {
      return;
    }

    try {
      const res = await fetchURL(`/api/raw${req.path}`, {});
      file.value = await res.arrayBuffer();
    } catch (e: any) {
      loadError.value = e?.message || t("errors.internal");
    }
  };

  watch(() => fileStore.req?.path, load, { immediate: true });

  return { file, loadError, name };
}
