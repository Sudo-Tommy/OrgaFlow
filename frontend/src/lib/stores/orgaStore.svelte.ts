import { OrgaLiveCollection } from '$lib/services/OrgaLiveCollection.svelte';
import type { 
    UserRecord, SuperuserRecord, AccountingRecord, AppointmentRecord, 
    ClientRecord, CompanyRecord, ContactRecord, DocumentTemplateRecord, 
    DriveRecordRecord, ExpenditureRecord, InsuranceRecord, InvoiceRecord, 
    LetterboxRecord, LiveChatRecord, MailboxMessageRecord, RetirementHomeRecord, 
    TaskRecord, TimeRecordRecord, UpdateRecord 
} from '$lib/types/orgaTypes';

// Hier definieren wir unsere zentralen Daten-Töpfe.
// Du kannst hier direkt Sortierungen (-created bedeutet absteigend) oder 
// Expands (z.B. lade die Versicherungsdaten beim Klienten direkt mit) festlegen.

export const orgaStore = {
    users: new OrgaLiveCollection<UserRecord>('users', { 
        expand: 'company',
        requestKey: null
    }),
    superusers: new OrgaLiveCollection<SuperuserRecord>('_superusers', { requestKey: null }),
    
    accounting: new OrgaLiveCollection<AccountingRecord>('accounting', { 
        sort: '-transaction_date',
        expand: 'related_document,createdby',
        requestKey: null
    }),
    
    appointments: new OrgaLiveCollection<AppointmentRecord>('appointments', { 
        sort: '-appointment', // Neueste Termine zuerst
        expand: 'user,client,drive_record,time_record,tasks,expenditures', // WIRKLICH ALLE Verknüpfungen
        requestKey: null
    }),
    
    clients: new OrgaLiveCollection<ClientRecord>('clients', { 
        sort: 'name_last', // Alphabetisch nach Nachnamen sortieren
        expand: 'insurance,retirement_homes,contacts,templates', // WIRKLICH ALLE Verknüpfungen
        requestKey: null
    }),
    
    company: new OrgaLiveCollection<CompanyRecord>('company', { 
        expand: 'users,clients',
        requestKey: null
    }),
    
    contacts: new OrgaLiveCollection<ContactRecord>('contacts', { sort: 'name_last', requestKey: null }),
    document_templates: new OrgaLiveCollection<DocumentTemplateRecord>('document_templates', { requestKey: null }),
    drive_records: new OrgaLiveCollection<DriveRecordRecord>('drive_records', { requestKey: null }),
    expenditure: new OrgaLiveCollection<ExpenditureRecord>('expenditure', { requestKey: null }),
    insurancies: new OrgaLiveCollection<InsuranceRecord>('insurancies', { sort: 'name', requestKey: null }),

    invoices: new OrgaLiveCollection<InvoiceRecord>('invoices', {
        sort: '-issue_date', // Neueste Rechnungen zuerst
        expand: 'user,client,appointments,company', // WIRKLICH ALLE Verknüpfungen
        requestKey: null
    }),

    letterboxes: new OrgaLiveCollection<LetterboxRecord>('letterboxes', { requestKey: null }),
    
    live_chat: new OrgaLiveCollection<LiveChatRecord>('live_chat', { 
        sort: '-created', 
        expand: 'user,whispered_user',
        requestKey: null
    }),
    
    mailbox_messages: new OrgaLiveCollection<MailboxMessageRecord>('mailbox_messages', { 
        sort: '-date',
        expand: 'client',
        requestKey: null
    }),
    
    retirement_homes: new OrgaLiveCollection<RetirementHomeRecord>('retirement_homes', { 
        sort: 'name',
        expand: 'contacts',
        requestKey: null
    }),
    
    tasks: new OrgaLiveCollection<TaskRecord>('tasks', { sort: '-created', requestKey: null }),
    time_records: new OrgaLiveCollection<TimeRecordRecord>('time_records', { sort: '-start', requestKey: null }),
    updates: new OrgaLiveCollection<UpdateRecord>('updates', { sort: '-date', requestKey: null })
};