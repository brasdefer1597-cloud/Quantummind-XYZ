// background.js
// Service Worker to handle context menu and communication.

if (typeof chrome !== 'undefined' && chrome.contextMenus) {
    // Create a context menu for the extension
    chrome.contextMenus.create({
        id: "dialectica-369-synthesize",
        title: "Synthesize with Hybrid Dialectic 369", // Title in English
        contexts: ["selection"] // Appears only when text is selected
    });

    // Listen for context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "dialectica-369-synthesize" && info.selectionText) {
            // Send the selected text to popup.js
            chrome.runtime.sendMessage({
                action: "textSelected", // Renamed action
                texto: info.selectionText
            });
        }
    });
}

// Listen for messages from content.js and forward them to popup.js (if open)
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "textSelected") { // Renamed action
            // Forward to any open popup script (popup.js)
            chrome.runtime.sendMessage(request);
        }
    });
}

