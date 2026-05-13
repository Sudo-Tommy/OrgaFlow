import { pb } from './pocketbase';
import type { RecordModel } from 'pocketbase';

/**
 * Email Service
 * 
 * Manages email CRUD operations:
 * - Read emails from mailbox
 * - Send new emails
 * - Delete emails
 * - Manage attachments
 */

export interface MailboxMessage extends RecordModel {
  user: string;
  message_id: string;
  folder: string;
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  body_html?: string;
  date: string;
  is_read: boolean;
  client?: string; // Optional relation to client
  created: string;
  updated: string;
}

export interface SendEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  body_html?: string;
  attachments?: File[];
}

export interface EmailFilter {
  folder: string;
  isRead?: boolean;
  fromAddress?: string;
  search?: string;
}

export function createEmailService() {
  let emails = $state<MailboxMessage[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let totalEmails = $state(0);
  let currentPage = $state(1);
  const pageSize = 20;

  const paginatedEmails = $derived.by(() => {
    const start = (currentPage - 1) * pageSize;
    return emails.slice(start, start + pageSize);
  });

  const totalPages = $derived.by(() => {
    return Math.ceil(totalEmails / pageSize);
  });

  return {
    get emails() {
      return emails;
    },
    get paginatedEmails() {
      return paginatedEmails;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get totalEmails() {
      return totalEmails;
    },
    get currentPage() {
      return currentPage;
    },
    get totalPages() {
      return totalPages;
    },
    set currentPage(page: number) {
      currentPage = Math.max(1, Math.min(page, totalPages));
    },

    // Fetch emails for a specific folder
    async loadEmails(filter: EmailFilter): Promise<MailboxMessage[]> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

        let filterStr = `user = "${authData.id}" && folder = "${filter.folder}"`;
        
        if (filter.isRead !== undefined) {
          filterStr += ` && is_read = ${filter.isRead}`;
        }
        if (filter.fromAddress) {
          filterStr += ` && from_address ~ "${filter.fromAddress}"`;
        }

        const records = await pb.collection('mailbox_messages').getFullList<MailboxMessage>({
          filter: filterStr,
          sort: '-date',
          batch: pageSize,
          page: currentPage
        });

        emails = records;
        totalEmails = records.length;
        return emails;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load emails';
        console.error('[Email] Load error:', error);
        return [];
      } finally {
        isLoading = false;
      }
    },

    // Search emails
    async searchEmails(query: string, folder: string): Promise<MailboxMessage[]> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

        const filterStr = `user = "${authData.id}" && folder = "${folder}" && (subject ~ "${query}" || body_text ~ "${query}" || from_address ~ "${query}")`;

        const records = await pb.collection('mailbox_messages').getFullList<MailboxMessage>({
          filter: filterStr,
          sort: '-date'
        });

        emails = records;
        totalEmails = records.length;
        return emails;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Search failed';
        console.error('[Email] Search error:', error);
        return [];
      } finally {
        isLoading = false;
      }
    },

    // Get single email
    async getEmail(emailId: string): Promise<MailboxMessage | null> {
      isLoading = true;
      error = null;
      try {
        const email = await pb.collection('mailbox_messages').getOne<MailboxMessage>(emailId);
        return email;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to fetch email';
        console.error('[Email] Get error:', error);
        return null;
      } finally {
        isLoading = false;
      }
    },

    // Mark email as read/unread
    async markAsRead(emailId: string, isRead: boolean): Promise<MailboxMessage> {
      isLoading = true;
      error = null;
      try {
        const formData = new FormData();
        formData.append('is_read', isRead.toString());

        const updated = await pb.collection('mailbox_messages').update<MailboxMessage>(
          emailId,
          formData
        );

        // Update in local state
        const index = emails.findIndex(e => e.id === emailId);
        if (index !== -1) {
          emails[index] = updated;
        }

        return updated;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to update email';
        console.error('[Email] Mark read error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Send new email
    async sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
      isLoading = true;
      error = null;
      try {
        const response = await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: input.to,
            cc: input.cc,
            bcc: input.bcc,
            subject: input.subject,
            body: input.body,
            body_html: input.body_html
          })
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        const result = await response.json();
        return { success: true, messageId: result.messageId };
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to send email';
        console.error('[Email] Send error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Delete email
    async deleteEmail(emailId: string): Promise<void> {
      isLoading = true;
      error = null;
      try {
        const response = await fetch('/api/mail/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: emailId })
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        // Remove from local state
        emails = emails.filter(e => e.id !== emailId);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to delete email';
        console.error('[Email] Delete error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Sync emails from IMAP
    async syncEmails(): Promise<{ synced_count: number }> {
      isLoading = true;
      error = null;
      try {
        const response = await fetch('/api/mail/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        const result = await response.json();
        return { synced_count: result.synced_count || 0 };
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to sync emails';
        console.error('[Email] Sync error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    }
  };
}

// Singleton instance
let emailService: ReturnType<typeof createEmailService>;

export function getEmailService() {
  if (!emailService) {
    emailService = createEmailService();
  }
  return emailService;
}
