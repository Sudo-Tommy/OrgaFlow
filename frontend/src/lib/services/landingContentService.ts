export function getServices() {
    return [
        {
            iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
            title: "Alltag & Begleitung",
            description: "Wir helfen Ihnen dabei, Termine zu vereinbaren, Unterlagen vorzubereiten und Anträge auszufüllen. Wenn Sie möchten, begleiten wir Sie auch zu Ärzten, Behörden oder zur Bank und stehen Ihnen mit Rat und Tat zur Seite."
        },
        {
            iconPath: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
            title: "Zuhause & Entlastung",
            description: "Wir unterstützen Sie bei alltäglichen Dingen wie dem Einkaufen oder bei leichten Handgriffen im Haushalt. Auch pflegende Angehörige können durch unsere stundenweise Betreuung endlich einmal unbesorgt durchatmen."
        },
        {
            iconPath: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
            title: "Absprachen & Vermittlung",
            description: "Es gibt oft viel abzustimmen: Mit der Krankenkasse, dem Pflegedienst, der Wohnungsgesellschaft oder rechtlichen Betreuern. Wir übernehmen diese Telefonate für Sie und erklären Ihnen alles in einfachen Worten."
        }
    ];
}

export function getProcessSteps() {
    return [
        {
            step: "1. Vorgespräch",
            title: "Unverbindliches Kennenlernen",
            text: "Wir telefonieren kurz, um Ihr Anliegen zu verstehen. Anschließend besuchen wir Sie zu Hause, besprechen in Ruhe, was Sie genau brauchen und halten alles in einer klaren, verständlichen Vereinbarung fest."
        },
        {
            step: "2. Vorbereitung",
            title: "Gemeinsame Planung",
            text: "Steht beispielsweise ein wichtiger Arztbesuch an? Wir erinnern Sie rechtzeitig daran, ordnen mit Ihnen zusammen vorab die wichtigen Papiere und überlegen, welche Fragen Sie dem Arzt stellen möchten."
        },
        {
            step: "3. Begleitung",
            title: "Sicher unterwegs",
            text: "Wir fahren gemeinsam zum Termin. Dort schreiben wir für Sie mit, damit keine wichtige Information verloren geht. Die Entscheidungen treffen dabei aber immer ganz allein Sie."
        },
        {
            step: "4. Nachbereitung",
            title: "Alles in Ordnung bringen",
            text: "Nach dem Termin heften wir gemeinsam die Unterlagen ab und besprechen, was als Nächstes zu tun ist. So behalten Sie jederzeit den perfekten Überblick über Ihre Angelegenheiten."
        }
    ];
}

export function getQualityFeatures() {
    return [
        {
            title: "Ihre Daten sind sicher",
            text: "Wir behandeln Ihre Unterlagen und Gesundheitsdaten streng vertraulich nach den gesetzlichen Vorgaben. Nur wer es von Ihnen erlaubt bekommt, erhält Auskünfte."
        },
        {
            title: "Sicherheit im Notfall",
            text: "Wir besprechen mit Ihnen vorab genau, wen wir anrufen sollen, falls es Ihnen einmal nicht gut geht (Angehörige, Hausarzt, Notruf). Sie sind nie allein gelassen."
        },
        {
            title: "Nachvollziehbar & Transparent",
            text: "Sie und Ihre Angehörigen können jederzeit einsehen, was wir wann für Sie erledigt haben. Wir schreiben kurze, übersichtliche Notizen zu jedem unserer Besuche."
        }
    ];
}

export function getCooperationScenarios() {
    return [
        {
            tag: "Frühzeitige Hilfe",
            title: "Vorsorge & Alltagshilfe",
            text: "Wenn Sie noch gut allein zurechtkommen, aber der Papierkram zu viel wird: Wir helfen Ihnen dabei, die Kontrolle zu behalten, damit ein gesetzlicher Betreuer gar nicht erst nötig wird."
        },
        {
            tag: "Hand in Hand",
            title: "Ergänzung zur gesetzlichen Betreuung",
            text: "Wenn Sie bereits einen gerichtlich bestellten Betreuer haben: Dieser kümmert sich um Verträge und Rechtsfragen, während wir Sie im Alltag begleiten und Zeit für menschliche Nähe haben."
        },
        {
            tag: "Sondersituationen",
            title: "Krankenhaus & Umzug",
            text: "Kommen Sie aus dem Krankenhaus oder ziehen um? Wir kümmern uns um die Organisation, Checklisten und den reibungslosen Ablauf in dieser stressigen Phase."
        }
    ];
}

export function getTeamMembers() {
    return [
        { name: "Tommy Jenzsch", initial: "T", region: "Halle (Saale)", phone: "0151 57515432" },
        { name: "Doreen Jenzsch", initial: "D", region: "Lutherstadt Wittenberg", phone: "0160 7303830" }
    ];
}

export function getFaqs() {
    return [
        {
            question: "Was bedeutet Assistenz genau?",
            answerLines: [
                "Wir nehmen Ihnen nichts weg. Das bedeutet: <strong>Die Entscheidungen treffen immer Sie selbst.</strong>",
                "Wir unterschreiben keine Verträge für Sie und wir setzen auch keine Spritzen. Wir sind Ihre vertrauensvollen Assistenten: Wir organisieren, wir begleiten Sie, ordnen Unterlagen und unterstützen Sie bei Ihren eigenen Vorhaben."
            ]
        },
        {
            question: "Übernimmt die Pflegekasse die Kosten?",
            answerLines: [
                "<strong>Das ist oft möglich!</strong> Wenn bei Ihnen bereits ein Pflegegrad (1 bis 5) festgestellt wurde, steht Ihnen monatlich der sogenannte <i>Entlastungsbetrag</i> (125 Euro nach § 45b SGB XI) zu.",
                "Sofern unsere Leistungen nach Landesrecht anerkannt sind, können wir oft direkt mit der Kasse abrechnen. Rufen Sie uns einfach an, wir klären das gerne mit Ihnen am Telefon."
            ]
        },
        {
            question: "Haftung & Schutz",
            answerLines: [
                "Zu Ihrer absoluten Sicherheit verfügen wir über eine umfassende Betriebshaftpflichtversicherung. Einen entsprechenden Nachweis legen wir Ihnen beim Kennenlernen gerne vor."
            ]
        }
    ];
}

export function getLegalContent() {
    return {
        impressum: `
            <h3>Impressum</h3>
            <p><strong>Angaben gemäß § 5 TMG:</strong></p>
            <p>Seniorenassistenz Jenzsch<br>
            Dreyhauptstraße 2<br>
            06108 Halle (Saale)</p>
            
            <p><strong>Vertreten durch:</strong><br>
            Tommy Jenzsch</p>
            
            <p><strong>Kontakt:</strong><br>
            Telefon: 0151 / 57515432<br>
            E-Mail: info@ihre-seniorenassistenz.com</p>

            <!-- <p><strong>Berufshaftpflichtversicherung:</strong><br>
            [Name und Sitz der Versicherung] (Bitte anpassen)<br>
            Geltungsraum der Versicherung: Deutschland</p> -->

        `,
        datenschutz: `
            <h3>Datenschutzerklärung</h3>
            <h4>1. Datenschutz auf einen Blick</h4>
            <p><strong>Allgemeine Hinweise</strong><br>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen oder unsere Dienstleistungen in Anspruch nehmen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>

            <h4>2. Datenerfassung auf dieser Website</h4>
            <p><strong>Wer ist verantwortlich für die Datenerfassung?</strong><br>
            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum entnehmen.</p>
            <p><strong>Wie erfassen wir Ihre Daten?</strong><br>
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie uns per E-Mail oder Telefon übermitteln. Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).</p>

            <h4>3. Zwecke der Datenverarbeitung & Rechtsgrundlagen</h4>
            <p>Wir verarbeiten Ihre Daten für die Anbahnung und Durchführung unserer Assistenzleistungen. Rechtsgrundlagen hierfür sind Art. 6 Abs. 1 lit. a (Einwilligung), b (Vertragserfüllung) sowie für Gesundheitsdaten Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung).</p>

            <h4>4. Ihre Rechte</h4>
            <p>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese jederzeit für die Zukunft widerrufen.</p>
        `
    };
}