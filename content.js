// content.js
// Script injected into the page to capture text selection upon mouse release.

document.addEventListener('mouseup', () => {
    // Capture the selected text from the window.
    const selectedText = window.getSelection().toString().trim();
    
    // Only send a message if there is actual text selected.
    // This selected text will be used by CHOLA (ai.summarizer) to define the Thesis/Root.
    if (selectedText.length > 0) {
        // Send the selected text to the Service Worker (background.js)
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: "textSelected", // Use English action name for consistency
                texto: selectedText
            });
        }
    }
});

