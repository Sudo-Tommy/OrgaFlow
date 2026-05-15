<script lang="ts">
  import { getEmailService, type MailboxMessage } from '$lib/services/emailService.svelte';

  interface Props {
    emailId: string;
    onDelete: () => void;
    onReply: () => void;
    onBack?: () => void;
  }

  let { emailId, onDelete, onReply, onBack } = $props();

  const emailService = getEmailService();
  let email = $state<MailboxMessage | null>(null);
  let isLoading = $state(false);

  // Load email on mount
  async function loadEmail() {
    isLoading = true;
    try {
      email = await emailService.getEmail(emailId);
    } catch (err) {
      console.error('[Mail Detail] Load error:', err);
    } finally {
      isLoading = false;
    }
  }

  $effect.pre(() => {
    loadEmail();
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="h-full flex flex-col">
  {#if isLoading}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-gray-500">Lädt...</p>
    </div>
  {:else if !email}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-gray-500">E-Mail nicht gefunden</p>
    </div>
  {:else}
    <!-- Header -->
    <div class="border-b border-gray-200 p-6 bg-white shrink-0">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{email.subject}</h2>
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <div>
              <p class="font-semibold text-gray-900">{email.from_address}</p>
              <p class="text-xs">an {email.to_address}</p>
            </div>
          </div>
        </div>
        <p class="text-sm text-gray-500">{formatDate(email.date)}</p>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 bg-white relative">
      <iframe 
          srcdoc={email.body_html || `<div style="font-family: sans-serif; padding: 20px;">${email.body_text?.replace(/\n/g, '<br>') || ''}</div>`} 
          class="absolute inset-0 w-full h-full border-none" 
          title="E-Mail Inhalt" 
          sandbox="allow-same-origin allow-popups"
      ></iframe>
    </div>

    <!-- Footer with actions -->
    <div class="border-t border-gray-200 p-3 md:p-4 bg-white flex flex-wrap gap-2 shrink-0 justify-around sm:justify-start">
      <button
        onclick={onReply}
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
      >
        <span class="text-base">↩️</span>
        Antworten
      </button>
      <button
        onclick={onReply}
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
      >
        <span class="text-base">↪️</span>
        Weiterleiten
      </button>
      <button
        onclick={onDelete}
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded"
      >
        <span class="text-base">🗑️</span>
        Löschen
      </button>
    </div>
  {/if}
</div>
