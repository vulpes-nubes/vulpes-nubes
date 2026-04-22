// Listen for the keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  if (command === "scrape-page") {
    // Get the active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0) {
        // Send a message to the content script to scrape the page
        chrome.tabs.sendMessage(tabs[0].id, {action: "scrape"}, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error scraping page:", chrome.runtime.lastError);
          } else if (response) {
            // Download the CSV file
            const blob = new Blob([response.csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            chrome.downloads.download({
              url: url,
              filename: `${response.lemma}_senses.csv`
            });
          }
        });
      }
    });
  }
});