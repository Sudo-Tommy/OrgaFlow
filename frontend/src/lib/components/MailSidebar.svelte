<script lang="ts">
  import type { MailboxFolder } from '$lib/services/mailboxService.svelte';
  import { MailPlus, Mail, Settings, RefreshCw, Inbox } from 'lucide-svelte';

  interface Props {
    folders: MailboxFolder[];
    selectedFolderPath: string;
    totalUnread: number;
    onFolderSelect: (path: string) => void;
    onConfigClick: () => void;
    onComposeClick: () => void;
    isLoading: boolean;
  }

  let { 
    folders, 
    selectedFolderPath, 
    totalUnread, 
    onFolderSelect, 
    onConfigClick, 
    onComposeClick,
    isLoading 
  } = $props();
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200">
    <div class="flex gap-2 mb-4">
      <button
        onclick={onComposeClick}
        disabled={isLoading}
        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <MailPlus size={18} />
        <span class="text-sm font-medium">Neue Mail</span>
      </button>
    </div>

    <button
      onclick={onConfigClick}
      class="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-2"
    >
      <Settings size={16} />
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
              <Inbox size={16} class="shrink-0" />
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
