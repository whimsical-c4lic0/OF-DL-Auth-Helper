async function getBcToken() {
    if (!window.localStorage.bcTokenSha) {
        return;
    }

    const bcToken = window.localStorage.bcTokenSha;

    /**
     * We don't have access to all cookies here, so instead we use a workaround
     * with the few cookie values we _do_ have access to.
     */
    const match = /st=(\w{64})/.exec(document.cookie);
    if (!match || !match[1]) {
        return;
    }

    const id = match[1];

    try {
        await chrome.runtime.sendMessage({
            bcTokenSha: bcToken,
            id: id,
        });
    }
    catch (err) {
        console.error('Error occurred when trying to send bcToken to background script', err);
    }
}

// Handle changes/updates to localStorage
window.addEventListener('storage', function() {
    if (window.localStorage.bcTokenSha) {
        getBcToken();
    }
});

getBcToken();
