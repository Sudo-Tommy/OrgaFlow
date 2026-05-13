<script lang="ts">
  import { getMailConfigService } from '$lib/services/mailConfigService.svelte';
  import { Mail, AlertCircle } from 'lucide-svelte';
  import type { SendEmailInput } from '$lib/services/emailService.svelte';

  interface Props {
    onSend: (input: SendEmailInput) => Promise<void>;
    onClose: () => void;
  }

  let { onSend, onClose } = $props();

  const mailConfigService = getMailConfigService();

  let to = $state('');
  let cc = $state('');
  let bcc = $state('');
  let subject = $state('');
  let body = $state('');
  let isSending = $state(false);
  let error = $state<string | null>(null);

  async function handleSend() {
    // Validate
    if (!to.trim()) {
      error = 'Empfänger ist erforderlich';
      return;
    }
    if (!subject.trim()) {
      error = 'Betreff ist erforderlich';
      return;
    }

    isSending = true;
    error = null;

    try {
      await onSend({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim()
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Fehler beim Versenden';
    } finally {
      isSending = false;
    }
  }
</script>

<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  onclick={onClose}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Modal -->
  <div
    class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-hidden flex flex-col"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
  >
    <!-- Header -->
    <div class="border-b border-gray-200 p-6 shrink-0">
      <div class="flex items-center gap-3">
        <Mail size={24} class="text-blue-600" />
        <h2 class="text-xl font-bold text-gray-900">Neue E-Mail</h2>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      {#if error}
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={20} class="text-red-600 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-red-800">{error}</p>
        </div>
      {/if}

      <div class="space-y-4">
        <!-- To field -->
        <div>
          <label for="to" class="block text-sm font-medium text-gray-700 mb-1">An *</label>
          <input
            id="to"
            type="email"
            bind:value={to}
            placeholder="empfaenger@example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            disabled={isSending}
          />
        </div>

        <!-- CC field -->
        <div>
          <label for="cc" class="block text-sm font-medium text-gray-700 mb-1">CC</label>
          <input
            id="cc"
            type="email"
            bind:value={cc}
            placeholder="cc@example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            disabled={isSending}
          />
        </div>

        <!-- BCC field -->
        <div>
          <label for="bcc" class="block text-sm font-medium text-gray-700 mb-1">BCC</label>
          <input
            id="bcc"
            type="email"
            bind:value={bcc}
            placeholder="bcc@example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            disabled={isSending}
          />
        </div>

        <!-- Subject -->
        <div>
          <label for="subject" class="block text-sm font-medium text-gray-700 mb-1">Betreff *</label>
          <input
            id="subject"
            type="text"
            bind:value={subject}
            placeholder="Betreff eingeben"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            disabled={isSending}
          />
        </div>

        <!-- Body -->
        <div>
          <label for="body" class="block text-sm font-medium text-gray-700 mb-1">Nachricht</label>
          <textarea
            id="body"
            bind:value={body}
            placeholder="Schreibe hier deine Nachricht..."
            rows="8"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
            disabled={isSending}
          />
        </div>

        {#if mailConfigService.config}
          <div class="p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-blue-900">
              <span class="font-medium">Von:</span> {mailConfigService.config.email_address}
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 shrink-0 justify-end">
      <button
        onclick={onClose}
        disabled={isSending}
        class="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg disabled:opacity-50"
      >
        Abbrechen
      </button>
      <button
        onclick={handleSend}
        disabled={isSending}
        class="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg disabled:opacity-50"
      >
        {isSending ? 'Wird gesendet...' : 'Senden'}
      </button>
    </div>
  </div>
</div>
