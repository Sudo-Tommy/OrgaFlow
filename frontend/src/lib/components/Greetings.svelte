<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from 'svelte';

    let userName = $state('');
    let greeting = $state('');
    let subGreeting = $state('');
    let emoji = $state('👋');

    onMount(() => {
        const user = pb.authStore.record || pb.authStore.model;
        userName = user?.name_first || user?.name || 'Chef';
        generateGreeting();
    });

    function generateGreeting() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sonntag, ..., 6 = Samstag
        const month = now.getMonth() + 1; // 1-12
        const date = now.getDate();

        let phrases: string[] = [];

        // --- 1. FEIER- UND AKTIONSTAGE ---
        if (month === 12 && date >= 24 && date <= 26) {
            greeting = "Fröhliche Weihnachten";
            emoji = "🎄";
            phrases = [
                "Weihnachten: Das Fest der Liebe und der überfüllten Postfächer.",
                "Plätzchen essen ist auch eine Leistung. Mach weiter so!",
                "Wenn du das hier liest, flüchtest du wohl gerade vor der Verwandtschaft.",
                "Frohes Fest! Hoffentlich war dein Geschenk besser als deine To-Do-Liste.",
                "Arbeiten an Weihnachten? Das Christkind notiert sich das auf der roten Liste.",
                "Ho, ho, hol mich hier raus!"
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 12 && date === 31) {
            greeting = "Guten Rutsch";
            emoji = "🥂";
            phrases = [
                "Guten Rutsch! Aber bitte nicht auf der Tastatur ausrutschen.",
                "Das Jahr ist fast rum. Du kannst jetzt aufhören, so zu tun, als würdest du arbeiten.",
                "Vorsätze für nächstes Jahr: Weniger E-Mails, mehr Kaffee.",
                "Zeit, die Fehler dieses Jahres elegant unter den Teppich zu kehren.",
                "Lass die Korken knallen – aber bitte nicht die Server!"
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 1 && date === 1) {
            greeting = "Frohes Neues Jahr";
            emoji = "🍀";
            phrases = [
                "Frohes Neues! Die Kopfschmerzen ignorieren wir heute einfach.",
                "Neues Jahr, neue Klienten-Dramen. Auf geht's!",
                "Tag 1 von 365. Zeit, die Vorsätze von gestern direkt wieder zu brechen.",
                "Bist du wirklich schon wach oder ist das nur ein Reflex?",
                "Willkommen im neuen Jahr! Der Kaffee schmeckt leider immer noch wie gestern."
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 10 && date === 31) {
            greeting = "Happy Halloween";
            emoji = "🎃";
            phrases = [
                "Süßes oder Saures? Das System hat sich für Saures entschieden.",
                "Das Einzige, was gruseliger ist als Geister, ist deine heutige To-Do-Liste.",
                "Versteck dich lieber, die Deadline kommt verkleidet als Zombie!",
                "Happy Halloween! Zeit, die Leichen aus dem Aktenkeller zu holen.",
                "Hoffentlich ist dein Kostüm besser als die Ausreden deiner Klienten."
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }
        if (month === 2 && date === 14) {
            greeting = "Schönen Valentinstag";
            emoji = "💘";
            phrases = [
                "Rosen sind rot, Veilchen sind blau, dein Kalender ist voll, oh wow.",
                "Heute schon dem Server gesagt, dass du ihn liebst? Nein? Dann wunder dich nicht.",
                "Ein guter Tag, um eine innige Beziehung mit dem Kaffeevollautomaten zu beginnen.",
                "Wer braucht schon Pralinen, wenn man unerledigte Aufgaben haben kann?",
                "Verteile heute Liebe... oder zumindest keine Absagen."
            ];
            subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
            return;
        }

        // --- 2. TAGESZEITEN ---
        if (hour >= 4 && hour < 11) {
            greeting = "Guten Morgen";
            emoji = "☕";
            phrases = [
                "Guten Morgen! Der Kaffee läuft, der Wille noch nicht so ganz.",
                "Willkommen zurück! Der alltägliche Wahnsinn hat dich schon vermisst.",
                "Gähn... lass uns einfach so tun, als wären wir heute hochproduktiv.",
                "Früher Vogel und so weiter. Hol dir erstmal Koffein, bevor du etwas kaputt machst.",
                "Morgen! Keine Sorge, ich bin auch noch nicht richtig hochgefahren.",
                "Schön, dass du da bist. Die Probleme haben sich über Nacht leider nicht selbst gelöst."
            ];
        } else if (hour >= 11 && hour < 14) {
            greeting = "Mahlzeit";
            emoji = "🍽️";
            phrases = [
                "Mahlzeit! Zeit für Kalorien, damit das Gehirn wieder anspringt.",
                "Mittagstief? Ein perfekter Zeitpunkt, um wichtige Entscheidungen auf morgen zu verschieben.",
                "Iss was Vernünftiges, du musst den Rest des Tages irgendwie noch überleben.",
                "Nahrung aufnehmen, lächeln, weiterarbeiten. Du kennst das Spiel.",
                "Falls du es vergessen hast: Atmen und Essen stehen heute auch auf der To-Do-Liste."
            ];
        } else if (hour >= 14 && hour < 18) {
            greeting = "Guten Nachmittag";
            emoji = "🚀";
            phrases = [
                "Guten Nachmittag! Nur noch ein paar Stunden so tun, als wärst du beschäftigt.",
                "Das Nachmittagstief schlägt unerbittlich zu. Zeit für den dritten Espresso.",
                "Endspurt! Schieb einfach alles, was heute nervt, elegant auf morgen.",
                "Noch wach? Sehr gut. Dann können wir ja noch etwas wegarbeiten.",
                "Nachmittags-Motivation ist ein Mythos. Halt einfach durch."
            ];
        } else if (hour >= 18 && hour < 22) {
            greeting = "Guten Abend";
            emoji = "🌙";
            phrases = [
                "Guten Abend! Dass du noch hier bist, grenzt leicht an Workoholismus.",
                "Überstunden? Ich hoffe, die werden wenigstens mit Pizza bezahlt.",
                "Feierabend ist, wenn man aufhört zu tippen. Denk mal in Ruhe drüber nach.",
                "Lass den Laptop in Frieden. Er hat heute auch schon genug gelitten.",
                "Draußen wird es dunkel. Ein dezenter Hinweis, dass man nach Hause gehen sollte."
            ];
        } else {
            greeting = "Gute Nacht";
            emoji = "🦉";
            phrases = [
                "Bist du ein Vampir oder hast du einfach kein Privatleben?",
                "Schlaf wird sowieso völlig überbewertet. Weiter geht's!",
                "Die Eulen sind los. Geh ins Bett, bevor du aus Müdigkeit Fehler einbaust.",
                "Mitten in der Nacht arbeiten? Der Server urteilt nicht, aber ich tue es schon.",
                "Gute Nacht! Schalt ab, morgen ist auch noch ein Tag zum Leiden."
            ];
        }

        // --- 3. WOCHENTAGE (Ergänzen/überschreiben) ---
        if (day === 1 && hour < 14) {
            phrases = [
                "Montag. Der Tag, an dem der Kaffee immer am schwächsten zu sein scheint.",
                "Neuer Montag, neue Probleme. Tun wir alle mal so, als wären wir motiviert.",
                "Überlebenstipp für Montage: Tief durchatmen und unnötigen Augenkontakt vermeiden.",
                "Willkommen am Montag. Das Wochenende war wie gewohnt viel zu kurz.",
                "Lass uns den heutigen Montag einfach schnell und extrem schmerzlos hinter uns bringen."
            ];
        }
        if (day === 3) {
            phrases = [
                "Bergfest! Ab jetzt geht es nur noch bergab. Hoffentlich nicht im wörtlichen Sinn.",
                "Mittwoch: Zu spät, um krank zu feiern, zu früh für's Wochenende.",
                "Die Hälfte ist geschafft. Der Rest der Woche ist reines Durchhaltevermögen.",
                "Herzlichen Glückwunsch, du hast bis zum ersehnten Mittwoch überlebt!",
                "Mittwoch ist wie der mittlere Sitz im Flugzeug. Keiner mag ihn, man muss da durch."
            ];
        }
        if (day === 5 && hour >= 12) {
            emoji = "🎉";
            phrases = [
                "Freitag ab eins macht jeder seins. Außer du, du arbeitest anscheinend noch.",
                "Das Wochenende riecht schon fast so gut wie frischer Kaffee.",
                "Achtung: Beginne jetzt keine neuen Projekte mehr. Das ist ein ungeschriebenes Freitags-Gesetz.",
                "Nur noch ein bisschen durchhalten, dann darfst du auf dem heimischen Sofa zusammenbrechen.",
                "Hoch die Hände, Wochenende! Aber erst nach diesem allerletzten Ticket."
            ];
        }
        if (day === 0 || day === 6) {
            emoji = "🛋️";
            phrases = [
                "Es ist Wochenende. Was genau machst du hier? Hast du gar keine Hobbys?",
                "Wochenendarbeit? Ich hoffe, dein Chef weiß das zu schätzen... oh warte, du bist der Chef.",
                "Geh raus in die Natur. Das Ding mit den Bäumen und dem echten Licht.",
                "Solltest du nicht eigentlich auf dem Sofa liegen und extrem produktiv nichts tun?",
                "Respekt für deinen ungebremsten Fleiß! Aber ernsthaft, klapp das Ding nun zu."
            ];
        }

        subGreeting = phrases[Math.floor(Math.random() * phrases.length)];
    }
</script>

<div class="mt-3 inline-flex items-center gap-4 bg-linear-to-r from-white to-brand-50/50 border border-brand-100/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow w-full">
    <div class="text-3xl md:text-4xl animate-waving-hand origin-bottom-right drop-shadow-sm">
        {emoji}
    </div>
    <div class="flex flex-col">
        <span class="text-lg md:text-xl font-black text-neutral-800 tracking-tight">
            {greeting}, <span class="text-brand-600">{userName}</span>!
        </span>
        <span class="text-sm font-bold text-neutral-500 mt-0.5 max-w-sm leading-tight">
            {subGreeting}
        </span>
    </div>
</div>

<style>
    .animate-waving-hand {
        animation: wave 2.5s infinite;
    }

    @keyframes wave {
        0% { transform: rotate(0deg); }
        10% { transform: rotate(14deg); }
        20% { transform: rotate(-8deg); }
        30% { transform: rotate(14deg); }
        40% { transform: rotate(-4deg); }
        50% { transform: rotate(10deg); }
        60%, 100% { transform: rotate(0deg); }
    }
</style>