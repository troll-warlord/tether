<template>
  <div class="space-y-lg">
    <!-- Core metadata -->
    <section>
      <h3 class="text-label text-text-muted mb-sm uppercase tracking-wider">Metadata</h3>
      <dl class="grid grid-cols-[auto_1fr] gap-xs text-body">
        <DescribeRow label="Name" :value="resource.name" mono />
        <DescribeRow label="Namespace" :value="resource.namespace || '—'" />
        <DescribeRow label="UID" :value="resource.uid" mono />
        <DescribeRow label="Age" :value="formatAge(resource.creationTimestamp)" />
        <DescribeRow label="Resource Version" :value="resource.resourceVersion" mono />
      </dl>
    </section>

    <!-- Labels -->
    <section v-if="labelChips.length">
      <h3 class="text-label text-text-muted mb-sm uppercase tracking-wider">Labels</h3>
      <div class="flex flex-wrap gap-xs">
        <span
          v-for="chip in labelChips"
          :key="chip"
          class="badge badge-unknown font-mono text-[11px]"
        >
          {{ chip }}
        </span>
      </div>
    </section>

    <!-- Annotations (collapsed) -->
    <section v-if="annotationChips.length">
      <button
        class="flex items-center gap-xs text-label text-text-muted uppercase tracking-wider mb-sm w-full text-left"
        @click="showAnnotations = !showAnnotations"
      >
        <ChevronRight
          :size="12"
          :class="{ 'rotate-90': showAnnotations }"
          class="transition-transform"
        />
        Annotations ({{ annotationChips.length }})
      </button>
      <div v-if="showAnnotations" class="flex flex-wrap gap-xs">
        <span
          v-for="chip in annotationChips"
          :key="chip"
          class="badge badge-unknown font-mono text-[11px] max-w-full truncate"
        >
          {{ chip }}
        </span>
      </div>
    </section>

    <!-- Secret data keys with eye-reveal -->
    <section v-if="resource._kind === 'secrets' && secretKeys.length">
      <h3 class="text-label text-text-muted mb-sm uppercase tracking-wider">Data</h3>
      <dl class="space-y-xs">
        <div v-for="key in secretKeys" :key="key" class="grid grid-cols-[auto_1fr] gap-xs">
          <dt class="text-text-muted pr-lg py-xs whitespace-nowrap text-body">{{ key }}</dt>
          <dd class="py-xs flex items-center gap-xs min-w-0">
            <code
              v-if="revealed[key]"
              class="font-mono text-mono text-text-primary break-all whitespace-pre-wrap"
            >
              {{ decodeSecret(key) }}
            </code>
            <span v-else class="text-text-muted text-mono tracking-widest select-none">
              ••••••••
            </span>
            <button
              class="btn-ghost btn-sm p-xs ml-xs flex-shrink-0"
              :title="revealed[key] ? 'Hide value' : 'Reveal decoded value'"
              @click="toggleReveal(key)"
            >
              <EyeOff v-if="revealed[key]" :size="13" />
              <Eye v-else :size="13" />
            </button>
          </dd>
        </div>
      </dl>
    </section>

    <!-- Pod-specific: containers -->
    <section v-if="resource._kind === 'pods' && resource.raw?.spec?.containers">
      <h3 class="text-label text-text-muted mb-sm uppercase tracking-wider">Containers</h3>
      <div v-for="c in resource.raw.spec.containers" :key="c.name" class="card p-sm mb-sm">
        <div class="flex items-center justify-between mb-xs">
          <span class="font-mono text-mono text-text-primary font-medium">{{ c.name }}</span>
          <ContainerStatusBadge :statuses="resource.raw.status?.containerStatuses" :name="c.name" />
        </div>
        <p class="text-body-sm text-text-muted truncate font-mono">{{ c.image }}</p>
        <div
          v-if="c.resources?.requests || c.resources?.limits"
          class="flex gap-md mt-xs text-caption text-text-muted"
        >
          <span v-if="c.resources.requests?.cpu">CPU req: {{ c.resources.requests.cpu }}</span>
          <span v-if="c.resources.requests?.memory">
            Mem req: {{ c.resources.requests.memory }}
          </span>
          <span v-if="c.resources.limits?.cpu">CPU lim: {{ c.resources.limits.cpu }}</span>
          <span v-if="c.resources.limits?.memory">Mem lim: {{ c.resources.limits.memory }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChevronRight, Eye, EyeOff } from 'lucide-vue-next'
import DescribeRow from './DescribeRow.vue'
import ContainerStatusBadge from './ContainerStatusBadge.vue'
import { formatAge, labelsToChips } from '../../composables/useFormatters'

const props = defineProps({
  resource: { type: Object, required: true },
})

const showAnnotations = ref(false)
const labelChips = computed(() => labelsToChips(props.resource.labels))
const annotationChips = computed(() => labelsToChips(props.resource.annotations))

// Secret data decode
const secretKeys = computed(() => Object.keys(props.resource.raw?.data ?? {}))
const revealed = ref({})
function toggleReveal(key) {
  revealed.value = { ...revealed.value, [key]: !revealed.value[key] }
}
function decodeSecret(key) {
  try {
    return atob(props.resource.raw.data[key])
  } catch {
    return '(cannot decode)'
  }
}
</script>
