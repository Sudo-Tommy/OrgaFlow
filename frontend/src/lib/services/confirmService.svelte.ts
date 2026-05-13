export function createConfirmService() {
    let isVisible = $state(false);
    let message = $state("");
    let title = $state("");
    let confirmText = $state("Ja");
    let cancelText = $state("Abbrechen");
    let isDanger = $state(false);
    let resolvePromise: ((value: boolean) => void) | null = null;

    function ask(msg: string, titleStr = "Bestätigung", confirmStr = "Ja", cancelStr = "Abbrechen", danger = false): Promise<boolean> {
        message = msg;
        title = titleStr;
        confirmText = confirmStr;
        cancelText = cancelStr;
        isDanger = danger;
        isVisible = true;

        return new Promise((resolve) => {
            resolvePromise = resolve;
        });
    }

    function respond(result: boolean) {
        isVisible = false;
        if (resolvePromise) {
            resolvePromise(result);
            resolvePromise = null;
        }
    }

    return {
        get isVisible() { return isVisible; }, get message() { return message; },
        get title() { return title; }, get confirmText() { return confirmText; },
        get cancelText() { return cancelText; }, get isDanger() { return isDanger; },
        ask, respond
    };
}
export const confirmStore = createConfirmService();