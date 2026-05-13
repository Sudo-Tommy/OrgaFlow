<script lang="ts">
  import type { MailConfig } from '$lib/services/mailConfigService.svelte';
  import type { MailConfigInput } from '$lib/services/mailConfigService.svelte';

  interface Props {
    currentConfig: MailConfig | null;
    isLoading: boolean;
    error: string | null;
    onSave: (input: MailConfigInput) => Promise<void>;
    onClose: () => void;
  }

  let { currentConfig, isLoading, error, onSave, onClose } = $props();

  let smtpHost = $state('');
  let smtpPort = $state(587);
  let smtpUser = $state('');
  let smtpPassword = $state(''); // Never show stored password
  let imapHost = $state('');
  let imapPort = $state(993);
  let emailAddress = $state('');
  let saveError = $state<string | null>(null);
  let isSaving = $state(false);

  $effect.pre(() => {
    if (currentConfig) {
      smtpHost = currentConfig.smtp_host || '';
      smtpPort = currentConfig.smtp_port || 587;
      smtpUser = currentConfig.smtp_user || '';
      imapHost = currentConfig.imap_host || '';
      imapPort = currentConfig.imap_port || 993;
      emailAddress = currentConfig.email_address || '';
    }
  });

  async function handleSave() {
    saveError = null;

    // Basic validation
    if (!smtpHost || !smtpUser || !emailAddress || !imapHost) {
      saveError = 'Alle Felder sind erforderlich';
      return;
    }

    if (!smtpPassword && !currentConfig) {
      saveError = 'SMTP-Passwort ist erforderlich';
      return;
    }

    isSaving = true;

    try {
      await onSave({
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPassword || '***',
        imap_host: imapHost,
        imap_port: imapPort,
        email_address: emailAddress
      });
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Fehler beim Speichern';
    } finally {
      isSaving = false;
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
    class="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-screen overflow-hidden flex flex-col"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="border-b border-gray-200 p-6 shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🔒</span>
        <h2 class="text-xl font-bold text-gray-900">E-Mail-Einstellungen (Firma)</h2>
      </div>
      <p class="text-sm text-gray-600 mt-2">
        Konfigurieren Sie die zentralen SMTP- und IMAP-Server für Ihr Unternehmen. (Benutzer können ihre Passwörter weiterhin im eigenen Profil hinterlegen).
      </p>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      {#if error || saveError}
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <span class="text-xl flex-shrink-0 mt-0.5">⚠️</span>
          <p class="text-sm text-red-800">{error || saveError}</p>
        </div>
      {/if}

      <div class="space-y-5">
        <!-- Email Address -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            E-Mail-Adresse *
          </label>
          <input
            id="email"
            type="email"
            bind:value={emailAddress}
            placeholder="deine.mail@ionos.com"
            disabled={isSaving}
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        <!-- SMTP Section -->
        <div class="pt-4 border-t border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">SMTP (E-Mails versenden)</h3>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="smtpHost" class="block text-sm font-medium text-gray-700 mb-1">
                Host *
              </label>
              <input
                id="smtpHost"
                type="text"
                bind:value={smtpHost}
                placeholder="smtp.ionos.com"
                disabled={isSaving}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label for="smtpPort" class="block text-sm font-medium text-gray-700 mb-1">
                Port *
              </label>
              <input
                id="smtpPort"
                type="number"
                bind:value={smtpPort}
                disabled={isSaving}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label for="smtpUser" class="block text-sm font-medium text-gray-700 mb-1">
              Benutzer *
            </label>
            <input
              id="smtpUser"
              type="text"
              bind:value={smtpUser}
              placeholder="deine.mail@ionos.com"
              disabled={isSaving}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 mb-4"
            />
          </div>

          <div>
            <label for="smtpPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Passwort (Zentral) {currentConfig ? '(leer = behalten)' : '*'}
            </label>
            <input
              id="smtpPassword"
              type="password"
              bind:value={smtpPassword}
              placeholder="Passwort eingeben"
              disabled={isSaving}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100"
            />
            <p class="text-xs text-gray-500 mt-1">Wird verschlüsselt gespeichert</p>
          </div>
        </div>

        <!-- IMAP Section -->
        <div class="pt-4 border-t border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">IMAP (E-Mails abrufen)</h3>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="imapHost" class="block text-sm font-medium text-gray-700 mb-1">
                Host *
              </label>
              <input
                id="imapHost"
                type="text"
                bind:value={imapHost}
                placeholder="imap.ionos.com"
                disabled={isSaving}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label for="imapPort" class="block text-sm font-medium text-gray-700 mb-1">
                Port *
              </label>
              <input
                id="imapPort"
                type="number"
                bind:value={imapPort}
                disabled={isSaving}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <!-- Ionos defaults hint -->
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm font-medium text-blue-900 mb-2">Ionos Standard-Einstellungen:</p>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• SMTP: smtp.ionos.com:587 (TLS) oder :465 (SSL)</li>
            <li>• IMAP: imap.ionos.com:993 (SSL)</li>
            <li>• Benutzer: Deine E-Mail-Adresse</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 flex-shrink-0 justify-end">
      <button
        onclick={onClose}
        disabled={isSaving || isLoading}
        class="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg disabled:opacity-50"
      >
        Abbrechen
      </button>
      <button
        onclick={handleSave}
        disabled={isSaving || isLoading}
        class="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg disabled:opacity-50"
      >
        {isSaving || isLoading ? 'Wird gespeichert...' : 'Speichern'}
      </button>
    </div>
  </div>
</div>
