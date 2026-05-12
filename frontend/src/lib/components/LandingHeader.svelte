<script lang="ts">
    import LoginLogout from "$lib/components/LoginLogout.svelte";
</script>

<header class="w-full px-6 py-5 flex justify-between items-center bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
    <div class="flex items-center gap-3">
        <span class="text-2xl font-bold tracking-tight text-neutral-900">Seniorenassistenz <span class="text-indigo-600">Jenzsch</span></span>
    </div>

    <div class="flex items-center gap-4">
        <span class="hidden md:inline text-sm text-neutral-500 font-medium">Intern:</span>
        <LoginLogout />
    </div>
</header>