console.log("Popup script loaded");

function handleScrape() {
  const status = document.getElementById('status');
  status.textContent = "Scraping...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      status.textContent = "Error: No active tab";
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = "Error: " + chrome.runtime.lastError.message;
        console.error("Popup error:", chrome.runtime.lastError);
      } else {
        status.textContent = "Scraping complete. Check downloads folder.";
        console.log("Scrape message sent from popup");
      }
    });
  });
}

document.getElementById('scrape').addEventListener('click', () => {
  console.log("Scrape button clicked");
  handleScrape();
});