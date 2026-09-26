<template>
  <header :class="{ 'header-transparent': transparent }">
    <img v-if="showLogo" :src="logoURL" alt="File Browser" />
    <Action
      v-if="showMenu"
      class="menu-button"
      icon="menu"
      :label="t('buttons.toggleSidebar')"
      @action="layoutStore.showHover('sidebar')"
    />

    <slot />

    <div
      id="dropdown"
      :class="{ active: layoutStore.currentPromptName === 'more' }"
    >
      <slot name="actions" />
    </div>

    <Action
      v-if="ifActionsSlot"
      id="more"
      icon="more_vert"
      :label="t('buttons.more')"
      @action="layoutStore.showHover('more')"
    />

    <div
      class="overlay"
      v-show="layoutStore.currentPromptName == 'more'"
      @click="layoutStore.closeHovers"
    />
  </header>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";

import { logoURL } from "@/utils/constants";

import Action from "@/components/header/Action.vue";
import { computed, useSlots } from "vue";
import { useI18n } from "vue-i18n";

defineProps<{
  showLogo?: boolean;
  showMenu?: boolean;
  transparent?: boolean;
}>();

const layoutStore = useLayoutStore();
const slots = useSlots();

const { t } = useI18n();

const ifActionsSlot = computed(() => (slots.actions ? true : false));
</script>

<style>
/* Transparent variant used inside the preview overlay. The preview background
   is dark, so the header should blend in while keeping icons/title readable. */
.header-transparent {
  background: transparent !important;
  color: #fff !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
}

.header-transparent > .action i,
.header-transparent > title {
  color: #fff !important;
  text-shadow: 1px 1px 1px #000 !important;
}

@media (min-width: 738px) {
  .header-transparent #dropdown .action i {
    color: #fff !important;
    text-shadow: 1px 1px 1px #000 !important;
  }
}
</style>
