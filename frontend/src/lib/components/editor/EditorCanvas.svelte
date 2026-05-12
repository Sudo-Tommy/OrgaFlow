<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import EditorField from "./EditorField.svelte";

    let { fields, selectedFieldId = $bindable() } = $props<{
        fields: CanvasField[];
        selectedFieldId: string | null;
    }>();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex-1 overflow-auto custom-scrollbar bg-[#EDF0F2] flex justify-center py-10" onclick={() => selectedFieldId = null}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="orga-canvas-a4 relative bg-white shadow-xl shadow-black/10 shrink-0" onclick={(e) => e.stopPropagation()}>
        {#each fields as _, i (fields[i].id)}
            <EditorField bind:field={fields[i]} allFields={fields} isSelected={selectedFieldId === fields[i].id} onSelect={() => selectedFieldId = fields[i].id} />
        {/each}
    </div>
</div>