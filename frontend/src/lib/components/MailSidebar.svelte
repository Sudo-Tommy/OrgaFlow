<script lang="ts">
  import type { MailboxFolder } from '$lib/services/mailboxService.svelte';

  interface Props {
    folders: MailboxFolder[];
    selectedFolderPath: string;
    totalUnread: number;
    onFolderSelect: (path: string) => void;
    onConfigClick: () => void;
    onComposeClick: () => void;
    isLoading: boolean;
    onCloseMenu?: () => void;
  }

  let { 
    folders, 
    selectedFolderPath, 
    totalUnread, 
    onFolderSelect, 
    onConfigClick, 
    onComposeClick,
    isLoading,
    onCloseMenu
  } = $props();
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 bg-white">
    <div class="flex items-center justify-between md:hidden mb-4">
      <h2 class="font-bold text-lg text-gray-900">Postfach</h2>
      <button aria-label="Menü schließen" onclick={onCloseMenu} class="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-lg"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
    </div>
    <div class="flex gap-2 mb-2 md:mb-4">
      <button
        onclick={onComposeClick}
        disabled={isLoading}
        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <span class="text-base">📝</span>
        <span class="text-sm font-medium">Neue Mail</span>
      </button>
    </div>

    <button
      onclick={onConfigClick}
      class="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-2"
    >
      <span class="text-base">⚙️</span>
      Einstellungen
    </button>
  </div>

  <!-- Unread count -->
  {#if totalUnread > 0}
    <div class="px-4 py-2 bg-blue-50 border-b border-blue-200">
      <p class="text-sm font-medium text-blue-900">{totalUnread} ungelesene Mails</p>
    </div>
  {/if}

  <!-- Folders -->
  <div class="flex-1 overflow-y-auto">
    {#if isLoading}
      <div class="p-4 text-center text-sm text-gray-500">Lädt...</div>
    {:else if folders.length === 0}
      <div class="p-4 text-center text-sm text-gray-500">Keine Ordner gefunden</div>
    {:else}
      <nav class="py-2">
        {#each folders as folder (folder.id)}
          <button
            onclick={() => onFolderSelect(folder.folder_path)}
            class={`w-full px-4 py-3 text-left text-sm hover:bg-gray-100 flex items-center justify-between group ${
              selectedFolderPath === folder.folder_path ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-900' : 'text-gray-700'
            }`}
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="text-base shrink-0">📥</span>
              <div class="min-w-0">
                <p class="font-medium truncate">{folder.folder_name}</p>
                <p class="text-xs text-gray-500">{folder.total_count || 0} E-Mails</p>
              </div>
            </div>
            {#if folder.unread_count > 0}
              <span class="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full shrink-0">
                {folder.unread_count}
              </span>
            {/if}
          </button>
        {/each}
      </nav>
    {/if}
  </div>
</div>
