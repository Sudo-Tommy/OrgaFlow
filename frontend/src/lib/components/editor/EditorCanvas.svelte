<script lang="ts">
    import { onMount } from "svelte";

    let { onInput, setRef } = $props<{
        onInput: () => void;
        setRef: (ref: HTMLDivElement) => void;
    }>();

    let divRef: HTMLDivElement;

    onMount(() => {
        setRef(divRef);
    });
</script>

<main class="flex-1 overflow-y-auto custom-scrollbar flex justify-center p-4 sm:p-8 bg-[#F8F9FA]">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        bind:this={divRef}
        class="orga-editor-page"
        contenteditable="true"
        oninput={onInput}
        onblur={onInput}
    ></div>
</main>