<script lang="ts">
  import type { MailboxMessage } from '$lib/services/emailService.svelte';

  interface Props {
    emails: MailboxMessage[];
    selectedEmailId: string | null;
    currentPage: number;
    totalPages: number;
    isLoading: boolean;
    folderName: string;
    onEmailSelect: (id: string) => void;
    onPageChange: (page: number) => void;
    onToggleMenu: () => void;
  }

  let { 
    emails, 
    selectedEmailId, 
    currentPage, 
    totalPages, 
    isLoading, 
    folderName,
    onEmailSelect,
    onPageChange,
    onToggleMenu
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
  <div class="p-4 border-b border-gray-200 shrink-0 flex items-center gap-3 bg-white sticky top-0 z-10">
    <button class="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onclick={onToggleMenu} aria-label="Menü öffnen">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
    </button>
    <div class="flex-1">
      <h2 class="text-lg font-bold text-gray-900">{folderName}</h2>
      <p class="text-xs font-semibold text-gray-500">{emails.length} E-Mail{emails.length !== 1 ? 's' : ''}</p>
    </div>
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
                <div class="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0"></div>
              {:else}
                <div class="w-2 h-2 shrink-0"></div>
              {/if}
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 justify-between">
                  <p class={`text-sm truncate max-w-50 ${email.is_read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'}`}>
                    {email.folder === 'Sent' ? `An: ${email.to_address?.split('<')[0] || email.to_address}` : (email.from_address?.split('<')[0] || email.from_address)}
                  </p>
                  <span class="text-xs text-gray-500 shrink-0">{formatDate(email.date)}</span>
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
    <div class="border-t border-gray-200 p-4 flex items-center justify-between shrink-0">
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
