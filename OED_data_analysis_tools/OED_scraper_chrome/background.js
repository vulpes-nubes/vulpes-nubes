// Background service worker script

// Listen for the keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  if (command === "scrape-page") {
    console.log("Keyboard shortcut triggered");
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0) {
        console.log("Sending scrape message to tab", tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, {action: "scrape"});
      }
    });
  }
});

// Listen for messages from content script with the scraped data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeResult") {
    console.log("Received scrape result in background script");
    console.log("Lemma:", request.lemma);
    console.log("CSV length:", request.csv.length);

    try {
      // Create a data URL
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(request.csv);

      // Clean the lemma for use in filename (remove special characters)
      const cleanLemma = request.lemma.replace(/[^a-zA-Z0-9_-]/g, '_');

      // Initiate download
      chrome.downloads.download({
        url: dataUrl,
        filename: `${cleanLemma}_senses.csv`,
        conflictAction: 'uniquify'
      }).then(downloadId => {
        console.log("Download initiated with ID:", downloadId);
      }).catch(error => {
        console.error("Download error:", error);
      });
    } catch (error) {
      console.error("Error creating download:", error);
    }
  }
  // No response needed, so we don't return true
});