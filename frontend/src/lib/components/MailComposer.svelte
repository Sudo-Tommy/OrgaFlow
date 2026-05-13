<script lang="ts">
  import { getMailConfigService } from '$lib/services/mailConfigService.svelte';
  import type { SendEmailInput } from '$lib/services/emailService.svelte';
  import { pb } from '$lib/services/pocketbase';

  interface Props {
    initialData?: any;
    onSend: (input: SendEmailInput) => Promise<void>;
    onClose: () => void;
  }

  let { initialData = null, onSend, onClose } = $props();

  const mailConfigService = getMailConfigService();

  let to = $state('');
  let cc = $state('');
  let bcc = $state('');
  let showCcBcc = $state(false);
  let subject = $state('');
  let body = $state('');
  let isSending = $state(false);
  let error = $state<string | null>(null);
  let attachments = $state<File[]>([]);

  $effect.pre(() => {
    if (initialData) {
      to = initialData.to || '';
      subject = initialData.subject || '';
      body = initialData.body || '';
    }
  });

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      attachments = [...attachments, ...Array.from(input.files)];
    }
    input.value = '';
  }

  function removeAttachment(index: number) {
    attachments = attachments.filter((_, i) => i !== index);
  }

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

    const user = pb.authStore.model;
    const userName = user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() : 'Ihre Seniorenassistenz';
    const userEmail = user?.email || 'info@ihre-seniorenassistenz.com';
    const userPhone = user?.handy || user?.tel || '0151 57515432';

    const textEmail = `${body.trim()}\n\n--\n${userName}\nIhre Seniorenassistenz\nDreyhauptstraße 2, 06108 Halle (Saale)\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: www.ihre-seniorenassistenz.com`;

    const htmlEmail = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #fdf8f6; padding: 25px 30px; border-bottom: 3px solid #c66a4d;">
                <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Ihre Seniorenassistenz</h1>
                <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Alltagshilfe • Betreuung • Organisation</p>
            </div>
            <div style="padding: 30px; font-size: 15px; line-height: 1.6; color: #1f2937; background-color: #ffffff;">
                ${body.trim().replace(/\n/g, '<br>')}
            </div>
            <div style="background-color: #f8fafc; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #4b5563;">
                    <tr>
                        <td style="padding-bottom: 15px;">
                            <strong style="color: #111827; font-size: 16px;">${userName}</strong><br>
                            <span style="color: #c66a4d;">Ihre Ansprechperson</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="line-height: 1.6;">
                            <strong>Ihre Seniorenassistenz</strong><br>
                            Dreyhauptstraße 2<br>
                            06108 Halle (Saale)<br><br>
                            📞 <a href="tel:${userPhone}" style="color: #c66a4d; text-decoration: none;">${userPhone}</a><br>
                            ✉️ <a href="mailto:${userEmail}" style="color: #c66a4d; text-decoration: none;">${userEmail}</a><br>
                            🌐 <a href="https://www.ihre-seniorenassistenz.com" style="color: #c66a4d; text-decoration: none;">www.ihre-seniorenassistenz.com</a>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    try {
      await onSend({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body: textEmail,
        body_html: htmlEmail,
        attachments: attachments.length > 0 ? attachments : undefined
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
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  onclick={onClose}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Modal -->
  <div
    class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="border-b border-gray-200 p-6 shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-2xl">✉️</span>
        <h2 class="text-xl font-bold text-gray-900">Neue E-Mail</h2>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      {#if error}
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <span class="text-xl shrink-0 mt-0.5">⚠️</span>
          <p class="text-sm text-red-800">{error}</p>
        </div>
      {/if}

      <div class="space-y-4">
        <!-- To field -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="to" class="block text-sm font-medium text-gray-700">An *</label>
            <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
          </div>
          <input
            id="to"
            type="email"
            bind:value={to}
            placeholder="empfaenger@example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            disabled={isSending}
          />
        </div>

        {#if showCcBcc}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-enter">
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
          </div>
        {/if}

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
            rows="6"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
            disabled={isSending}
          ></textarea>
        </div>

    {#if attachments.length > 0}
      <div class="flex flex-wrap gap-2 pt-2">
        {#each attachments as file, i}
          <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
            <span class="truncate max-w-50 font-medium">📎 {file.name}</span>
            <button type="button" onclick={() => removeAttachment(i)} class="text-rose-500 hover:text-rose-700 font-bold ml-1" disabled={isSending} title="Anhang entfernen">✕</button>
          </div>
        {/each}
      </div>
    {/if}

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
  <div class="border-t border-gray-200 p-6 bg-gray-50 flex justify-between items-center shrink-0">
    <div>
      <input type="file" id="file-upload" multiple class="hidden" onchange={handleFileSelect} disabled={isSending} />
      <button type="button" onclick={() => document.getElementById('file-upload')?.click()} class="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-blue-600 transition-colors px-4 py-2 bg-white hover:bg-blue-50 border border-neutral-200 rounded-lg" disabled={isSending}>
        📎 Datei anhängen
      </button>
    </div>
    <div class="flex gap-3">
      <button onclick={onClose} disabled={isSending} class="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg disabled:opacity-50">
        Abbrechen
      </button>
      <button onclick={handleSend} disabled={isSending} class="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg disabled:opacity-50">
        {isSending ? 'Wird gesendet...' : 'Senden'}
      </button>
    </div>
  </div>
  </div>
</div>
