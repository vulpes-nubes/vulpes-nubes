chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    console.log("Scraping OED page...");

    // Extract lemma and remove any trailing part of speech
    const h1Text = document.querySelector('h1')?.textContent.trim() || "unknown";
    // This regex matches the lemma by capturing everything up to "verb", "noun", "adj", etc.
    const lemmaMatch = h1Text.match(/^(.*?)(?:verb|noun|adj|adv|int|prep|conj|pron)\.?$/i);
    const lemma = lemmaMatch ? lemmaMatch[1].trim() : h1Text;
    console.log("Lemma:", lemma);

    // Extract etymology
    let etymology = "";
    const etymologyHeader = document.querySelector('h3.etymology-summary-header');
    if (etymologyHeader) {
      const etymologyContainer = etymologyHeader.closest('.tab-content-body');
      if (etymologyContainer) {
        const etymologyDiv = etymologyContainer.querySelector('.tab-content-body > div');
        if (etymologyDiv) {
          etymology = etymologyDiv.textContent.trim();
        }
      }
    }
    console.log("Etymology:", etymology);

    // Extract etymology keywords (languages)
    const etymologyKeywords = Array.from(etymology.matchAll(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g))
      .map(match => `etymology: ${match[1]}`);
    console.log("Etymology Keywords:", etymologyKeywords);

    // Extract senses and examples
    const senses = [];
    const meaningSection = document.querySelector('section#meaning_and_use');
    if (meaningSection) {
      const senseBlocks = meaningSection.querySelectorAll('.senses-list .item.sense, .senses-list .item.subsense');
      senseBlocks.forEach(block => {
        const senseId = block.querySelector('.item-enumerator')?.textContent.trim() || "unknown";
        const definitionDiv = block.querySelector('.definition');
        const definition = definitionDiv ? definitionDiv.textContent.trim() : "";
        console.log(`Sense ${senseId}:`, definition);

        const examples = [];
        const quotationBlocks = block.querySelectorAll('.quotation-block-wrapper .quotation');
        quotationBlocks.forEach(quote => {
          const dateSpan = quote.querySelector('.quotation-date .date');
          const date = dateSpan ? dateSpan.textContent.trim() : "";
          const citation = quote.querySelector('.citation .citation-text');
          const source = citation ? citation.textContent.trim() : "";
          const quotationText = quote.querySelector('.quotation-text');
          const content = quotationText ? quotationText.textContent.trim() : "";
          if (date || source || content) {
            examples.push({ date, source, content });
          }
        });

        senses.push({ senseId, definition, examples });
      });
    }

    // Generate CSV
    let csv = "lemma,sense_id,definition,etymology,etymology_keywords,example_date,example_source,example_content\n";
    senses.forEach(sense => {
      sense.examples.forEach(example => {
        const row = `"${lemma}","${sense.senseId}","${sense.definition.replace(/"/g, '""')}","${etymology.replace(/"/g, '""')}","${etymologyKeywords.join(', ')}","${example.date}","${example.source.replace(/"/g, '""')}","${example.content.replace(/"/g, '""')}"`;
        csv += row + "\n";
      });
    });

    console.log("CSV generated:", csv);
    sendResponse({ lemma, csv });
  }
});