<script lang="ts">
    import { goto } from "$app/navigation";
    import { pb } from "$lib/services/pocketbase";

    let isLoading = $state(false);
    let errorMsg = $state("");

    // Formular-Daten
    let formData = $state({
        name_first: "",
        name_last: "",
        email: "",
        phone: "",
        status: "Aktiv",
        level_of_care: "",
        street: "",
        zip: "",
        city: ""
    });

    // Signatur-Status
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let uploadedFile = $state<File | null>(null);
    let hasDrawnSignature = $state(false);

    // --- Canvas (Zeichen) Logik ---
    function getPointerPos(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (window.TouchEvent && e instanceof TouchEvent) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        // Skalierung berücksichtigen (interne Auflösung vs css Auflösung)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        if (!canvas) return;
        e.preventDefault();
        isDrawing = true;
        hasDrawnSignature = true;
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#4f46e5"; // indigo-600
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function clearSignature() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        hasDrawnSignature = false;
        uploadedFile = null;
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            uploadedFile = target.files[0];
        } else {
            uploadedFile = null;
        }
    }

    // --- Speichern ---
    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const pbFormData = new FormData();
            for (const [key, value] of Object.entries(formData)) {
                pbFormData.append(key, value);
            }

            // Signatur anhängen, falls neu gezeichnet/hochgeladen
            if (signatureMode === "upload" && uploadedFile) {
                pbFormData.append("sign", uploadedFile);
            } else if (signatureMode === "draw" && hasDrawnSignature && canvas) {
                const blob = await new Promise<Blob | null>(resolve => canvas!.toBlob(resolve, "image/png"));
                if (blob) {
                    pbFormData.append("sign", blob, "signature.png");
                }
            }

            const newClient = await pb.collection('clients').create(pbFormData);
            
            // Nach erfolgreicher Anlage direkt zur Detailansicht wechseln
            goto(`/clients/${newClient.id}`);
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Anlegen des Klienten.";
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <a href="/clients" class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm flex items-center gap-2 mb-4 transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Zurück zur Übersicht
        </a>
        <h1 class="orga-page-title">Neuer Klient</h1>
        <p class="orga-page-subtitle">Legen Sie hier einen neuen Klienten an.</p>
    </div>
</div>

<div class="orga-card-white p-6 md:p-8 max-w-4xl mx-auto animate-enter delay-100">
    {#if errorMsg}
        <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>
    {/if}

    <form onsubmit={onSubmit} class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label for="new-firstname" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname</label><input id="new-firstname" type="text" bind:value={formData.name_first} class="orga-input-clear" required disabled={isLoading} /></div>
            <div><label for="new-lastname" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname</label><input id="new-lastname" type="text" bind:value={formData.name_last} class="orga-input-clear" required disabled={isLoading} /></div>
            <div><label for="new-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="new-email" type="email" bind:value={formData.email} class="orga-input-clear" disabled={isLoading} /></div>
            <div><label for="new-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon</label><input id="new-phone" type="text" bind:value={formData.phone} class="orga-input-clear" disabled={isLoading} /></div>
            <div><label for="new-status" class="block text-sm font-semibold text-neutral-700 mb-1.5">Status</label><select id="new-status" bind:value={formData.status} class="orga-input-clear" disabled={isLoading}><option value="Aktiv">Aktiv</option><option value="Inaktiv">Inaktiv</option><option value="Verstorben">Verstorben</option></select></div>
            <div><label for="new-carelevel" class="block text-sm font-semibold text-neutral-700 mb-1.5">Pflegegrad</label><select id="new-carelevel" bind:value={formData.level_of_care} class="orga-input-clear" disabled={isLoading}><option value="">Keiner</option><option value="0">Grad 0</option><option value="1">Grad 1</option><option value="2">Grad 2</option><option value="3">Grad 3</option><option value="4">Grad 4</option><option value="5">Grad 5</option></select></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2"><label for="new-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße & Hausnr.</label><input id="new-street" type="text" bind:value={formData.street} class="orga-input-clear" disabled={isLoading} /></div>
            <div><label for="new-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label><input id="new-zip" type="text" bind:value={formData.zip} class="orga-input-clear" disabled={isLoading} /></div>
            <div class="md:col-span-3"><label for="new-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt</label><input id="new-city" type="text" bind:value={formData.city} class="orga-input-clear" disabled={isLoading} /></div>
        </div>

        <!-- Signatur Bereich -->
        <div class="border border-neutral-200 rounded-2xl p-4 md:p-6 bg-neutral-50/50">
            <div class="flex items-center justify-between mb-4">
                <span class="block text-sm font-semibold text-neutral-900">Unterschrift (Optional)</span>
                <div class="flex bg-neutral-200/60 p-1 rounded-lg">
                    <button type="button" onclick={() => signatureMode = 'draw'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Zeichnen</button>
                    <button type="button" onclick={() => signatureMode = 'upload'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {signatureMode === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Hochladen</button>
                </div>
            </div>

            {#if signatureMode === 'draw'}
                <div class="relative bg-white border-2 border-dashed border-neutral-200 rounded-xl overflow-hidden touch-none">
                    <canvas 
                        bind:this={canvas} 
                        width="600" height="200" 
                        class="w-full h-40 cursor-crosshair"
                        onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                        ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                    ></canvas>
                    <button type="button" onclick={clearSignature} class="absolute top-2 right-2 px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-semibold rounded-md transition-colors">Leeren</button>
                    {#if !hasDrawnSignature}
                        <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-300 font-medium text-sm">Hier unterschreiben</div>
                    {/if}
                </div>
            {:else}
                <div class="bg-white border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center">
                    <input type="file" accept="image/png, image/jpeg" class="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors" onchange={handleFileChange} />
                </div>
            {/if}
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <a href="/clients" class="orga-button-ghost {isLoading ? 'pointer-events-none opacity-50' : ''}">Abbrechen</a>
            <button type="submit" class="orga-button-primary" disabled={isLoading}>{isLoading ? "Speichert..." : "Klient anlegen"}</button>
        </div>
    </form>
</div>