document.getElementById('scrape').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.textContent = "Scraping...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (response) => {
      if (response) {
        status.textContent = "Downloading CSV...";
        const blob = new Blob([response.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: `${response.verb}_senses.csv`
        });
        status.textContent = "Done!";
      } else {
        status.textContent = "Failed to scrape.";
      }
    });
  });
});