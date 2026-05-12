<script lang="ts">
    import { pb } from "$lib/services/pocketbase";

    // Wir holen uns den Vornamen des Nutzers (oder einen Fallback)
    const userName = pb.authStore.record?.name_first || "Kollege";

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6; // 0 = Sonntag, 6 = Samstag

    let greeting = "";

    if (isWeekend) {
        const weekendQuotes = [
            `Hoch die Hände, Wochenende... Moment, warum arbeitest du eigentlich, ${userName}? 🧐`,
            `Es ist Wochenende, ${userName}! Hat dir das niemand gesagt? 🌴`,
            `Sonntagszuschlag? Wohl eher Leidenschaft. Fleißig, fleißig, ${userName}! 💼`,
            `Eigentlich ist ja Wochenende, aber für dich machen wir eine Ausnahme, ${userName}. ☕`
        ];
        // Wähle einen zufälligen Wochenend-Spruch
        greeting = weekendQuotes[Math.floor(Math.random() * weekendQuotes.length)];
    } else {
        if (hour >= 0 && hour < 5) {
            greeting = `Nachteule unterwegs! Schlaf wird völlig überbewertet, was, ${userName}? 🦉`;
        } else if (hour >= 5 && hour < 11) {
            greeting = `Guten Morgen, ${userName}! Der Kaffee läuft schon... hoffentlich. ☕`;
        } else if (hour >= 11 && hour < 14) {
            greeting = `Mahlzeit, ${userName}! Vergiss nicht, zwischen den Terminen auch mal Pause zu machen. 🍽️`;
        } else if (hour >= 14 && hour < 18) {
            greeting = `Guten Nachmittag, ${userName}! Der Endspurt für heute läuft. 🚀`;
        } else {
            greeting = `Guten Abend, ${userName}! Mach nicht mehr so lange, okay? 🌙`;
        }
    }
</script>

<p class="orga-dashboard-subtitle">{greeting}</p>