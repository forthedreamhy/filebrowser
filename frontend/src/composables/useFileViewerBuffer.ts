import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { fetchURL } from "@/api/utils";
import { encodePath } from "@/utils/url";
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
    const req = fileStore.req;
    const path = req && !req.isDir ? req.path : null;
    file.value = null;
    loadError.value = "";

    if (path === null) {
      return;
    }

    try {
      const res = await fetchURL(`/api/raw${encodePath(path)}`, {});
      const buffer = await res.arrayBuffer();
      // 快速切换文件时较慢的旧请求不应覆盖当前文件的内容。
      if (fileStore.req?.path !== path) {
        return;
      }
      file.value = buffer;
    } catch (e: any) {
      if (fileStore.req?.path !== path) {
        return;
      }
      loadError.value = e?.message || t("errors.internal");
    }
  };

  watch(() => fileStore.req?.path, load, { immediate: true });

  return { file, loadError, name };
}
