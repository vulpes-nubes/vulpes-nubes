chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    console.log("Scraping OED page...");

    // Extract lemma and thoroughly remove part of speech
    const h1Text = document.querySelector('h1')?.textContent.trim() || "unknown";

    // Split on comma and take the first part, then clean it up
    let lemma = h1Text.split(',')[0].trim();

    // Additional cleanup for cases where the part of speech might not be separated by comma
    // This handles cases like "lemmaverb" or "lemmanoun1"
    lemma = lemma.replace(/[a-z]+$/, '').trim();  // Remove trailing lowercase letters (part of speech)
    lemma = lemma.replace(/[a-z]+\d*$/, '').trim();  // Remove trailing lowercase letters with optional numbers
    lemma = lemma.replace(/[vnadjadvintprepconjpron]\.?\d*$/, '').trim();  // Remove specific part of speech markers

    // Final cleanup for any remaining non-lemma characters
    lemma = lemma.replace(/[^a-zA-Z0-9\-']+$/, '').trim();

    console.log("Lemma:", lemma);

    // Extract etymology and remove "Summary"
    let etymology = "";
    const etymologyHeader = document.querySelector('h3.etymology-summary-header');
    if (etymologyHeader) {
      const etymologyContainer = etymologyHeader.closest('.tab-content-body');
      if (etymologyContainer) {
        const etymologyDiv = etymologyContainer.querySelector('.tab-content-body > div');
        if (etymologyDiv) {
          etymology = etymologyDiv.textContent.trim();
          // Remove "Summary" from etymology
          etymology = etymology.replace(/^Summary/i, '').trim();
        }
      }
    }
    console.log("Etymology:", etymology);

    // Define valid language names and lexicographic terms
    const validLanguages = [
      'Latin', 'French', 'Germanic', 'Old English', 'Middle English', 'Greek', 'Italian',
      'Spanish', 'Dutch', 'Norse', 'Sanskrit', 'Arabic', 'Hebrew', 'Celtic', 'Gothic',
      'Slavic', 'Russian', 'Chinese', 'Japanese', 'Portuguese', 'Swedish', 'Danish',
      'Old French', 'Middle French', 'Norman', 'Anglo-Norman', 'Old Norse', 'Old High German',
      'Middle High German', 'Old Saxon', 'Middle Dutch', 'Old Frisian', 'Old Icelandic',
      'Old Swedish', 'Crimean Gothic', 'West Germanic', 'East Norse', 'Scots', 'Indo-European',
      'Proto-Germanic', 'Proto-Indo-European', 'Old Irish', 'Welsh', 'Breton', 'Cornish'
    ];

    const validLexicographicTerms = [
      'imitative', 'onomatopoeic', 'expressive', 'iconic', 'borrowing', 'calque', 'blend',
      'compound', 'derivative', 'back-formation', 'clipping', 'acronym', 'initialism'
    ];

    // Extract and clean etymology keywords
    const etymologyKeywords = [];
    if (etymology) {
      // Use regex to find potential language/term matches
      const potentialMatches = etymology.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g) || [];

      for (const match of potentialMatches) {
        const normalizedMatch = match.trim();

        // Check for valid languages
        const languageMatch = validLanguages.find(lang =>
          normalizedMatch.toLowerCase() === lang.toLowerCase()
        );

        if (languageMatch) {
          etymologyKeywords.push(`etymology: ${languageMatch}`);
          continue;
        }

        // Check for valid lexicographic terms
        const termMatch = validLexicographicTerms.find(term =>
          normalizedMatch.toLowerCase() === term.toLowerCase()
        );

        if (termMatch) {
          etymologyKeywords.push(`lexicographic: ${termMatch}`);
        }
      }
    }

    // Remove duplicates
    const uniqueKeywords = [...new Set(etymologyKeywords)];
    console.log("Etymology Keywords:", uniqueKeywords);

    // Extract senses and examples
    const senses = [];
    const meaningSection = document.querySelector('section#meaning_and_use');
    if (meaningSection) {
      const senseBlocks = meaningSection.querySelectorAll('.senses-list .item.sense, .senses-list .item.subsense');
      senseBlocks.forEach(block => {
        const senseId = block.querySelector('.item-enumerator')?.textContent.trim() || "unknown";
        const definitionDiv = block.querySelector('.definition');
        let definition = definitionDiv ? definitionDiv.textContent.trim() : "";

        // Remove any "Summary" text from definitions
        definition = definition.replace(/^Summary/i, '').trim();

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
        const row = `"${lemma}","${sense.senseId}","${sense.definition.replace(/"/g, '""')}","${etymology.replace(/"/g, '""')}","${uniqueKeywords.join(', ')}","${example.date}","${example.source.replace(/"/g, '""')}","${example.content.replace(/"/g, '""')}"`;
        csv += row + "\n";
      });
    });

    console.log("CSV generated:", csv);
    sendResponse({ lemma, csv });
  }
});