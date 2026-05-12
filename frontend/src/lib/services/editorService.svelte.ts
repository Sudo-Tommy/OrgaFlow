import { pb } from "$lib/services/pocketbase";
import { goto } from "$app/navigation";

export function useEditor(initialDocId: string | null) {
    let docId = $state(initialDocId);
    let title = $state("Unbenannte Vorlage");
    let content = $state("<p><br></p>");
    let isSaving = $state(false);
    let saveMessage = $state("");
    let editorRef: HTMLDivElement | null = null;

    async function load() {
        if (docId) {
            try {
                const record = await pb.collection('document_templates').getOne(docId);
                title = record.title || "Unbenannte Vorlage";
                content = record.content_html || "<p><br></p>";
                if (editorRef) editorRef.innerHTML = content;
            } catch (err) {
                console.error("Vorlage konnte nicht geladen werden", err);
            }
        }
    }

    function setEditorRef(ref: HTMLDivElement) {
        editorRef = ref;
        if (content && editorRef) {
            editorRef.innerHTML = content;
        }
    }

    function format(command: string, value: string | undefined = undefined) {
        document.execCommand(command, false, value);
        if (editorRef) editorRef.focus();
    }

    function insertPlaceholder(placeholder: string) {
        if (!placeholder) return;
        document.execCommand('insertText', false, placeholder);
        if (editorRef) editorRef.focus();
        handleInput();
    }

    function handleInput() {
        if (editorRef) content = editorRef.innerHTML;
    }

    async function save() {
        isSaving = true;
        saveMessage = "Speichert...";
        try {
            const data = { title, content_html: content };
            if (docId) {
                await pb.collection('document_templates').update(docId, data);
            } else {
                const newDoc = await pb.collection('document_templates').create(data);
                docId = newDoc.id; // Damit beim nächsten Speichern nur geupdatet wird
                goto(`/documents/${newDoc.id}`, { replaceState: true, keepFocus: true });
            }
            saveMessage = "Gespeichert!";
            setTimeout(() => saveMessage = "", 2000);
        } catch (err) {
            console.error(err);
            saveMessage = "Fehler beim Speichern!";
        } finally {
            isSaving = false;
        }
    }

    return {
        get title() { return title; },
        set title(v) { title = v; },
        get content() { return content; },
        set content(v) { content = v; },
        get isSaving() { return isSaving; },
        get saveMessage() { return saveMessage; },
        load,
        save,
        format,
        insertPlaceholder,
        handleInput,
        setEditorRef
    };
}