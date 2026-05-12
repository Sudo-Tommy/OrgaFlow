import { pb } from "$lib/services/pocketbase";

export function useProfileService() {
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");

    let id = $state<string | null>(null);
    let collection = $state<string>("users");
    let recordData = $state<any>(null);
    
    let formData = $state({
        username: "",
        name_first: "",
        name_last: "",
        email: "",
        phone: ""
    });

    let passwordData = $state({
        oldPassword: "",
        password: "",
        passwordConfirm: ""
    });

    let avatarFile = $state<File | null>(null);
    let existingAvatarUrl = $state("");
    let deleteAvatar = $state(false);
    
    let signFile = $state<File | null>(null);
    let existingSignUrl = $state("");
    let deleteSign = $state(false);

    let isLoaded = $state(false);

    function load() {
        const record = pb.authStore.record;
        if (record) {
            id = record.id;
            collection = record.collectionName; // 'users' oder '_superusers'
            recordData = record;
            formData = {
                username: record.username || "",
                name_first: record.name_first || "",
                name_last: record.name_last || "",
                email: record.email || "",
                phone: record.phone || ""
            };
            if (record.avatar) {
                existingAvatarUrl = pb.files.getURL(record, record.avatar);
            } else {
                existingAvatarUrl = "";
            }
        if (record.sign) {
                existingSignUrl = pb.files.getURL(record, record.sign);
        } else {
            existingSignUrl = "";
        }
            isLoaded = true;
        }
    }

    async function saveProfile() {
        if (!id) return;
        isLoading = true;
        errorMsg = "";
        successMsg = "";

        try {
            const pbFormData = new FormData();
            
            pbFormData.append("name_first", formData.name_first);
            pbFormData.append("name_last", formData.name_last);
            
            if (formData.username && formData.username !== pb.authStore.record?.username) {
                pbFormData.append("username", formData.username);
            }
            
            if (formData.email !== pb.authStore.record?.email) {
                pbFormData.append("email", formData.email);
            }
            
            if (formData.phone !== undefined) {
                pbFormData.append("phone", formData.phone);
            }

            if (avatarFile) {
                pbFormData.append("avatar", avatarFile);
            } else if (deleteAvatar) {
                pbFormData.append("avatar", "");
            }
        
        if (signFile) {
            pbFormData.append("sign", signFile);
        } else if (deleteSign) {
            pbFormData.append("sign", "");
        }

            await pb.collection(collection).update(id, pbFormData);
            
            // Refresh UI Daten nach Speichern
            existingAvatarUrl = pb.authStore.record?.avatar ? pb.files.getURL(pb.authStore.record, pb.authStore.record.avatar) : "";
            avatarFile = null;
            deleteAvatar = false;
        
            existingSignUrl = pb.authStore.record?.sign ? pb.files.getURL(pb.authStore.record, pb.authStore.record.sign) : "";
        signFile = null;
        deleteSign = false;

            successMsg = "Profil erfolgreich gespeichert!";
            setTimeout(() => successMsg = "", 3000);
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern des Profils.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }

    async function savePassword() {
        if (!id) return;
        isLoading = true;
        errorMsg = "";
        successMsg = "";

        try {
            await pb.collection(collection).update(id, {
                oldPassword: passwordData.oldPassword,
                password: passwordData.password,
                passwordConfirm: passwordData.passwordConfirm
            });

            passwordData = { oldPassword: "", password: "", passwordConfirm: "" };
            successMsg = "Passwort erfolgreich geändert!";
            setTimeout(() => successMsg = "", 3000);
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Ändern des Passworts.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }

    return {
        get formData() { return formData; },
        get recordData() { return recordData; },
        get passwordData() { return passwordData; },
        get avatarFile() { return avatarFile; },
        set avatarFile(v) { avatarFile = v; },
        get existingAvatarUrl() { return existingAvatarUrl; },
        get deleteAvatar() { return deleteAvatar; },
        set deleteAvatar(v) { deleteAvatar = v; },
        get signFile() { return signFile; }, set signFile(v) { signFile = v; },
        get existingSignUrl() { return existingSignUrl; },
        get deleteSign() { return deleteSign; }, set deleteSign(v) { deleteSign = v; },
        get isLoading() { return isLoading; },
        get errorMsg() { return errorMsg; },
        get successMsg() { return successMsg; },
        get isLoaded() { return isLoaded; },
        load,
        saveProfile,
        savePassword
    };
}