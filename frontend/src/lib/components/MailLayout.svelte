<script lang="ts">
  import { getMailConfigService, type MailConfigInput } from '$lib/services/mailConfigService.svelte';
  import { getMailboxService } from '$lib/services/mailboxService.svelte';
  import { getEmailService } from '$lib/services/emailService.svelte';
  import MailSidebar from './MailSidebar.svelte';
  import MailList from './MailList.svelte';
  import MailDetail from './MailDetail.svelte';
  import MailComposer from './MailComposer.svelte';
  import MailConfigModal from './MailConfigModal.svelte';

  const mailConfigService = getMailConfigService();
  const mailboxService = getMailboxService();
  const emailService = getEmailService();

  let selectedEmailId = $state<string | null>(null);
  let showComposer = $state(false);
  let replyData = $state<any>(null);
  let showConfigModal = $state(false);
  let isInitialized = $state(false);

  // Initialize on mount
  async function initializeMail() {
    if (isInitialized) return;
    
    try {
      // Check if config exists
      const config = await mailConfigService.loadConfig();
      
      if (!config) {
        // Show config modal if no config
        showConfigModal = true;
      } else {
        // Load folders and sync
        await mailboxService.loadFolders();
        
        // E-Mails sofort initial für den ausgewählten Ordner laden
        if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({ folder: mailboxService.selectedFolderPath });
        }
        
        await emailService.syncEmails();
        
        // Nach dem Sync die E-Mails und Ordner nochmal aktualisieren
        if (mailboxService.selectedFolderPath) {
          await emailService.loadEmails({ folder: mailboxService.selectedFolderPath });
          await mailboxService.loadFolders();
        }
      }
      
      isInitialized = true;
    } catch (err) {
      console.error('[Mail Layout] Init error:', err);
    }
  }

  // Handle config save
  async function handleConfigSave(input: MailConfigInput) {
    try {
      await mailConfigService.saveConfig(input);
      showConfigModal = false;
      
      // Now load mailbox
      await mailboxService.loadFolders();
      await emailService.syncEmails();
    } catch (err) {
      console.error('[Mail Layout] Config save error:', err);
    }
  }

  // Handle folder selection
  function handleFolderSelect(folderPath: string) {
    mailboxService.selectedFolderPath = folderPath;
    selectedEmailId = null;
    if (mailboxService.selectedFolder) {
      emailService.loadEmails({
        folder: folderPath
      });
    }
  }

  // Handle email selection
  function handleEmailSelect(emailId: string) {
    selectedEmailId = emailId;
  }

  // Handle email delete
  async function handleEmailDelete(emailId: string) {
    try {
      await emailService.deleteEmail(emailId);
      selectedEmailId = null;
      // Reload emails for current folder
      if (mailboxService.selectedFolder) {
        await emailService.loadEmails({
          folder: mailboxService.selectedFolder.folder_path
        });
      }
    } catch (err) {
      console.error('[Mail Layout] Delete error:', err);
    }
  }

  // Handle reply
  async function handleEmailReply(emailId: string) {
    try {
      const email = await emailService.getEmail(emailId);
      if (email) {
        replyData = {
          to: email.from_address?.match(/<(.+)>/)?.[1] || email.from_address,
          subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
          body: `\n\n\n--- Ursprüngliche Nachricht ---\nVon: ${email.from_address}\nDatum: ${new Date(email.date).toLocaleString('de-DE')}\nBetreff: ${email.subject}\n\n${email.body_text}`
        };
        showComposer = true;
      }
    } catch (err) {
      console.error('Reply error:', err);
    }
  }

  // Handle email send
  async function handleEmailSend(input: any) {
    try {
      await emailService.sendEmail(input);
      showComposer = false;
      // Sync to get updated sent folder
      await emailService.syncEmails();
    } catch (err) {
      console.error('[Mail Layout] Send error:', err);
    }
  }

  // Initialize on component mount
  $effect.pre(() => {
    initializeMail();
  });
</script>

<div class="flex h-full w-full bg-white">
  <!-- Sidebar -->
  <div class="w-64 border-r border-gray-300 bg-white">
    {#if mailConfigService.isLoading}
      <div class="p-4 text-center text-sm text-gray-500">Lädt...</div>
    {:else if mailConfigService.error}
      <div class="p-4 text-center text-sm text-red-500">{mailConfigService.error}</div>
    {:else}
      <MailSidebar
        folders={mailboxService.folders}
        selectedFolderPath={mailboxService.selectedFolderPath}
        totalUnread={mailboxService.totalUnread}
        onFolderSelect={handleFolderSelect}
        onConfigClick={() => (showConfigModal = true)}
        onComposeClick={() => (showComposer = true)}
        isLoading={mailboxService.isLoading}
      />
    {/if}
  </div>

  <!-- Main content -->
  <div class="flex-1 flex flex-col">
    {#if !mailConfigService.hasConfig}
      <div class="flex-1 flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-gray-800 mb-4">E-Mail konfigurieren</h2>
          <p class="text-gray-600 mb-6">
            Bitte konfigurieren Sie Ihre SMTP/IMAP-Einstellungen, um E-Mails zu versenden und zu empfangen.
          </p>
          <button
            onclick={() => (showConfigModal = true)}
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Einstellungen öffnen
          </button>
        </div>
      </div>
    {:else}
      {#if emailService.error || mailboxService.error}
        <div class="bg-rose-50 border-b border-rose-200 p-3 text-sm font-semibold text-rose-700 flex items-center z-10 shadow-sm animate-enter">
           <span>⚠️ {emailService.error || mailboxService.error}</span>
        </div>
      {/if}
      <!-- Mail list and detail -->
      <div class="flex-1 flex overflow-hidden">
        <!-- List -->
        <div class="w-96 border-r border-gray-300 bg-white overflow-y-auto">
          <MailList
            emails={emailService.paginatedEmails}
            selectedEmailId={selectedEmailId}
            currentPage={emailService.currentPage}
            totalPages={emailService.totalPages}
            isLoading={emailService.isLoading}
            onEmailSelect={handleEmailSelect}
            onPageChange={(page) => (emailService.currentPage = page)}
          />
        </div>

        <!-- Detail -->
        <div class="flex-1 bg-gray-50 overflow-y-auto">
          {#if selectedEmailId}
            <MailDetail
              emailId={selectedEmailId}
              onDelete={() => handleEmailDelete(selectedEmailId || '')}
              onReply={() => handleEmailReply(selectedEmailId || '')}
            />
          {:else}
            <div class="flex items-center justify-center h-full">
              <p class="text-gray-500">E-Mail auswählen zum Anzeigen</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Composer Modal -->
  {#if showComposer}
    <MailComposer initialData={replyData} onSend={handleEmailSend} onClose={() => { showComposer = false; replyData = null; }} />
  {/if}

  <!-- Config Modal -->
  {#if showConfigModal}
    <MailConfigModal
      currentConfig={mailConfigService.config}
      isLoading={mailConfigService.isLoading}
      error={mailConfigService.error}
      onSave={handleConfigSave}
      onClose={() => (showConfigModal = false)}
    />
  {/if}
</div>
