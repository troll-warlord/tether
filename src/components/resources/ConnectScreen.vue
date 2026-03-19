<template>
  <div class="flex h-full bg-bg-base overflow-hidden">
    <!-- ── Left panel: brand + features ──────────────────────────────── -->
    <div
      class="hidden md:flex flex-col justify-between w-[420px] flex-shrink-0 p-2xl"
      style="
        background: var(--color-sidebar-bg);
        border-right: 1px solid var(--color-sidebar-border);
      "
    >
      <!-- Brand -->
      <div>
        <div class="flex items-center gap-sm mb-xl">
          <div
            class="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-elevated"
          >
            <Anchor :size="22" class="text-white" />
          </div>
          <div>
            <h1 class="text-heading font-bold text-white leading-none">tether</h1>
            <p class="text-caption" style="color: var(--color-sidebar-text-muted)">
              Kubernetes Dashboard
            </p>
          </div>
        </div>

        <p class="text-body mb-2xl" style="color: var(--color-sidebar-text-muted)">
          A lightweight, read-write Kubernetes dashboard that runs entirely in your browser — no
          server required.
        </p>

        <!-- Feature list -->
        <ul class="space-y-lg">
          <li v-for="feat in features" :key="feat.title" class="flex items-start gap-md">
            <div
              class="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0 opacity-90"
            >
              <component :is="feat.icon" :size="15" class="text-white" />
            </div>
            <div>
              <p class="text-label font-semibold text-white">{{ feat.title }}</p>
              <p class="text-body-sm mt-xs" style="color: var(--color-sidebar-text-muted)">
                {{ feat.desc }}
              </p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Footer note -->
      <p class="text-caption" style="color: var(--color-sidebar-text-muted)">
        Connects via
        <code class="font-mono" style="color: var(--color-brand)">kubectl proxy</code>
        — nothing leaves your machine.
      </p>
    </div>

    <!-- ── Right panel: connect form ──────────────────────────────────── -->
    <div
      class="flex-1 flex flex-col items-center justify-center px-xl py-2xl overflow-y-auto relative"
      style="background: radial-gradient(ellipse 80% 55% at 50% 38%, var(--color-brand-subtle) 0%, transparent 68%)"
    >
      <!-- Dot grid decoration -->
      <div
        class="pointer-events-none absolute inset-0"
        style="
          background-image: radial-gradient(
            circle,
            var(--color-border) 1px,
            transparent 1px
          );
          background-size: 28px 28px;
          opacity: 0.45;
        "
      />

      <!-- Mobile-only logo -->
      <div class="relative flex md:hidden items-center gap-sm mb-xl">
        <div class="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
          <Anchor :size="18" class="text-white" />
        </div>
        <h1 class="text-heading font-bold text-text-primary">tether</h1>
      </div>

      <!-- Form card -->
      <div
        class="relative w-full max-w-lg rounded-2xl border border-border bg-bg-elevated shadow-elevated"
        style="backdrop-filter: blur(2px)"
      >
        <!-- Accent bar -->
        <div class="h-[3px] w-full rounded-t-2xl bg-brand" />

        <div class="px-2xl py-xl">
          <h2 class="text-heading-sm font-semibold text-text-primary mb-xs">
            Connect to your cluster
          </h2>
          <p class="text-body text-text-secondary mb-xl">
            Follow the steps below, then click <strong class="text-text-primary">Connect</strong>.
          </p>

          <!-- Steps -->
          <ol class="mb-xl">
            <li v-for="(step, i) in steps" :key="i" class="flex gap-md">
              <!-- Indicator + connector -->
              <div class="flex flex-col items-center flex-shrink-0">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold ring-2"
                  :class="
                    i < currentStep
                      ? 'bg-status-running text-white ring-status-running/30'
                      : 'bg-brand text-white ring-brand/25'
                  "
                >
                  <Check v-if="i < currentStep" :size="12" />
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <div
                  v-if="i < steps.length - 1"
                  class="w-px flex-1 my-xs min-h-[12px]"
                  style="background: var(--color-border)"
                />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 pb-lg">
                <p class="text-label text-text-primary font-semibold leading-[28px]">{{ step.title }}</p>
                <p class="text-body-sm text-text-muted mt-xs">{{ step.description }}</p>
                <div v-if="step.code" class="relative mt-sm group">
                  <!-- Terminal chrome -->
                  <div
                    class="flex items-center gap-xs px-sm py-[6px] rounded-t-md border border-b-0 border-border"
                    style="background: var(--color-bg-sunken)"
                  >
                    <span class="w-[10px] h-[10px] rounded-full bg-red-500/70" />
                    <span class="w-[10px] h-[10px] rounded-full bg-yellow-500/70" />
                    <span class="w-[10px] h-[10px] rounded-full bg-green-500/70" />
                    <span class="ml-auto text-caption text-text-muted font-mono opacity-50">bash</span>
                  </div>
                  <code
                    class="block font-mono text-mono px-sm py-sm rounded-b-md border border-border pr-[36px] overflow-x-auto whitespace-pre"
                    style="background: var(--color-bg-sunken); color: var(--color-brand)"
                  >{{ step.code }}</code>
                  <button
                    class="absolute right-xs bottom-[10px] btn-ghost btn-sm p-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy command"
                    @click="copyCode(step.code)"
                  >
                    <Check v-if="copiedCode === step.code" :size="12" class="text-status-running" />
                    <Copy v-else :size="12" />
                  </button>
                </div>
              </div>
            </li>
          </ol>

          <!-- Dev mode banner -->
          <div
            v-if="isDev"
            class="flex items-center gap-sm p-sm rounded-lg bg-brand-subtle text-brand text-body-sm mb-md border border-brand/20"
          >
            <Zap :size="13" class="flex-shrink-0" />
            <span>
              Dev proxy active — requests are forwarded to
              <code class="font-mono">localhost:8001</code>
              automatically.
            </span>
          </div>

          <!-- URL input (prod only) -->
          <div v-else class="mb-md">
            <label class="text-label text-text-secondary mb-xs block">kubectl proxy URL</label>
            <div class="flex gap-sm">
              <input
                v-model="urlInput"
                type="url"
                class="input flex-1"
                placeholder="http://localhost:8001"
                @keyup.enter="connect"
              />
              <button class="btn-secondary btn-sm" @click="urlInput = 'http://localhost:8001'">
                Reset
              </button>
            </div>
          </div>

          <!-- Error -->
          <div
            v-if="connStore.status === 'error'"
            class="flex flex-col gap-xs p-sm rounded-lg bg-status-failed-bg text-status-failed text-body-sm mb-md border border-status-failed/20"
          >
            <div class="flex items-center gap-sm">
              <AlertCircle :size="14" class="flex-shrink-0" />
              <span>{{ connStore.errorMessage }}</span>
            </div>
            <p class="text-caption pl-[22px] text-status-failed opacity-80">
              Make sure
              <code class="font-mono">kubectl proxy</code>
              is running in a terminal, then try again.
            </p>
          </div>

          <!-- Connect button -->
          <button class="btn-primary w-full" :disabled="connStore.isConnecting" @click="connect">
            <Loader2 v-if="connStore.isConnecting" :size="16" class="spin" />
            <Plug v-else :size="16" />
            {{ connStore.isConnecting ? 'Connecting…' : 'Connect' }}
          </button>

          <!-- Security note -->
          <p class="flex items-center justify-center gap-xs text-caption text-text-muted mt-md">
            <ShieldCheck :size="11" class="flex-shrink-0" />
            No credentials stored — no data leaves your machine
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  Anchor,
  Check,
  AlertCircle,
  Loader2,
  Plug,
  Zap,
  Copy,
  LayoutGrid,
  Search,
  FileCode2,
  ShieldCheck,
  GitBranch,
} from 'lucide-vue-next'
import { useConnectionStore } from '../../stores/connection'
import { useNamespaceStore } from '../../stores/namespaces'
import { useRouter } from 'vue-router'

const connStore = useConnectionStore()
const nsStore = useNamespaceStore()
const router = useRouter()

const isDev = import.meta.env.DEV
const urlInput = ref(connStore.baseUrl || 'http://localhost:8001')
const currentStep = ref(0)
const copiedCode = ref(null)

const features = [
  {
    icon: LayoutGrid,
    title: 'All resource types',
    desc: 'Workloads, services, storage, RBAC, Helm releases — all in one place.',
  },
  {
    icon: Search,
    title: 'Instant search & filter',
    desc: 'Filter by namespace, search by name, or scope everything to a Helm chart.',
  },
  {
    icon: FileCode2,
    title: 'View & edit YAML',
    desc: 'Browse the live YAML for any resource and push changes directly to the cluster.',
  },
  {
    icon: ShieldCheck,
    title: 'Secrets decoded',
    desc: 'Reveal base64-decoded secret values with a single click.',
  },
  {
    icon: GitBranch,
    title: 'Helm-aware',
    desc: 'See all Helm releases and filter resources by chart name.',
  },
]

const steps = [
  {
    title: 'Start kubectl proxy',
    description: 'Run this in your terminal to expose the Kubernetes API locally.',
    code: "kubectl proxy --address='127.0.0.1' --accept-hosts='^localhost$,^127\\.0\\.0\\.1$'",
  },
  {
    title: 'Ensure cluster access',
    description: 'Verify your kubeconfig is configured and you have the right context active.',
    code: 'kubectl config current-context',
  },
  {
    title: 'Click Connect',
    description: 'Tether will connect to the proxy and load your cluster resources.',
    code: null,
  },
]

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    copiedCode.value = code
    setTimeout(() => {
      copiedCode.value = null
    }, 2000)
  })
}

async function connect() {
  if (!isDev) connStore.setBaseUrl(urlInput.value)
  currentStep.value = 2
  const ok = await connStore.connect()
  if (ok) {
    await nsStore.fetchNamespaces()
    router.push('/dashboard')
  }
}

watch(urlInput, () => {
  currentStep.value = Math.min(currentStep.value, 1)
})
</script>
