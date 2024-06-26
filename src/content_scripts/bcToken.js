async function getBcToken()
{
    const ls = window.localStorage;
    if (!ls.bcTokenSha) {
        return;
    }

    const bcToken = ls.bcTokenSha;

    /**
     * We don't have access to all cookies here, so instead we use a workaround
     * with the few cookie values we _do_ have access to.
     */
    const match = new RegExp(/st=(\w{64})/).exec(document.cookie);
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
    const ls = window.localStorage;

    if (ls.bcTokenSha) {
        getBcToken();
    }
});

getBcToken();
