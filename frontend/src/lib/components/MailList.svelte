<script lang="ts">
  import type { MailboxMessage } from '$lib/services/emailService.svelte';

  interface Props {
    emails: MailboxMessage[];
    selectedEmailId: string | null;
    currentPage: number;
    totalPages: number;
    isLoading: boolean;
    onEmailSelect: (id: string) => void;
    onPageChange: (page: number) => void;
  }

  let { 
    emails, 
    selectedEmailId, 
    currentPage, 
    totalPages, 
    isLoading, 
    onEmailSelect,
    onPageChange
  } = $props();

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'Eben';
    if (hours < 24) return `vor ${Math.floor(hours)}h`;
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    return date.toLocaleDateString('de-DE');
  }

  function truncateText(text: string, length: number = 50) {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 shrink-0">
    <p class="text-sm font-semibold text-gray-700">{emails.length} E-Mails</p>
  </div>

  <!-- Email list -->
  <div class="flex-1 overflow-y-auto">
    {#if isLoading}
      <div class="p-4 text-center text-sm text-gray-500">Lädt...</div>
    {:else if emails.length === 0}
      <div class="p-4 text-center text-sm text-gray-500">Keine E-Mails</div>
    {:else}
      <div class="divide-y divide-gray-200">
        {#each emails as email (email.id)}
          <button
            onclick={() => onEmailSelect(email.id)}
            class={`w-full p-4 text-left hover:bg-gray-50 transition border-l-4 ${
              selectedEmailId === email.id
                ? 'bg-blue-50 border-blue-600'
                : email.is_read
                  ? 'border-transparent'
                  : 'border-blue-600 bg-blue-50'
            }`}
          >
            <div class="flex items-start gap-3">
              {#if !email.is_read}
                <div class="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
              {:else}
                <div class="w-2 h-2 flex-shrink-0"></div>
              {/if}
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 justify-between">
                  <p class={`text-sm truncate max-w-[200px] ${email.is_read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'}`}>
                    {email.folder === 'Sent' ? `An: ${email.to_address?.split('<')[0] || email.to_address}` : (email.from_address?.split('<')[0] || email.from_address)}
                  </p>
                  <span class="text-xs text-gray-500 flex-shrink-0">{formatDate(email.date)}</span>
                </div>
                <p class={`text-sm truncate ${email.is_read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                  {email.subject || '(Kein Betreff)'}
                </p>
                <p class="text-xs text-gray-500 truncate">{truncateText(email.body_text || email.body_html || '', 50)}</p>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="border-t border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
      <button
        onclick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        class="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
        aria-label="Vorherige Seite"
      >
        <span class="text-sm">◀️</span>
      </button>
      <span class="text-sm text-gray-600">{currentPage} / {totalPages}</span>
      <button
        onclick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        class="p-1 hover:bg-gray-100 disabled:opacity-50 rounded"
        aria-label="Nächste Seite"
      >
        <span class="text-sm">▶️</span>
      </button>
    </div>
  {/if}
</div>
