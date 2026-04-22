// Shared function to handle scraping
function handleScrape() {
  const status = document.getElementById('status');
  status.textContent = "Scraping...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = "Error: " + chrome.runtime.lastError.message;
      } else if (response) {
        status.textContent = "Downloading CSV...";
        const blob = new Blob([response.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: `${response.lemma}_senses.csv`
        });
        status.textContent = "Done!";
      } else {
        status.textContent = "No data returned. Check console for errors.";
      }
    });
  });
}

// Add event listener for the button
document.getElementById('scrape').addEventListener('click', handleScrape);