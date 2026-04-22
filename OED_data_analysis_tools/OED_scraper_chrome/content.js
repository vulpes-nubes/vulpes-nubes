console.log("Content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    console.log("Scraping OED page...");

    // Extract lemma and thoroughly remove part of speech
    const h1Text = document.querySelector('span.headword')?.textContent.trim() || "unknown";

    // Improved lemma extraction to handle all cases
    let lemma = h1Text;
    // Remove everything after comma (part of speech)
    lemma = lemma.split(',')[0].trim();
    // Remove any trailing part of speech markers (verb, noun, adj, etc.)
    lemma = lemma.replace(/\s+[a-z]+$/, '').trim();
    // Remove any trailing numbers or dots
    lemma = lemma.replace(/[\d.]+$/, '').trim();
    // Remove any remaining non-word characters at the end
    lemma = lemma.replace(/[^a-zA-Z0-9\-']+$/, '').trim();

    console.log("Extracted lemma:", lemma);

    // If lemma is empty after cleaning, use a default
    if (!lemma || lemma === "") {
      lemma = "unknown_lemma";
      console.warn("Using default lemma name: unknown_lemma");
    }

    // Extract etymology and remove "Summary"
    let etymology = "";
    const etymologyHeader = document.querySelector('h3.etymology-summary-header');
    if (etymologyHeader) {
      const etymologyContainer = etymologyHeader.closest('.tab-content-body');
      if (etymologyContainer) {
        const etymologyDiv = etymologyContainer.querySelector('.tab-content-body > div');
        if (etymologyDiv) {
          etymology = etymologyDiv.textContent.trim();
          etymology = etymology.replace(/^Summary/i, '').trim();
        }
      }
    }
    console.log("Extracted etymology:", etymology);

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
      'compound', 'derivative', 'back-formation', 'clipping', 'acronym', 'initialism',
      'affix', 'prefix', 'suffix', 'infix', 'reduplication', 'ablaut', 'umlaut', 'metathesis',
      'assimilation', 'dissimilation', 'epenthesis', 'apocope', 'syncopation', 'prothesis',
      'parasis', 'aphaeresis', 'metanalysis', 'reanalysis', 'folk etymology', 'contamination',
      'portmanteau', 'loan translation', 'semantic loan', 'reborrowing', 'inherited',
      'substrate', 'superstrate', 'adstrate', 'dialectal', 'colloquial', 'slang',
      'archaic', 'obsolete', 'rare', 'literary', 'poetic', 'nonstandard', 'regional',
      'vulgar', 'euphemistic', 'taboo', 'jocular', 'ironic', 'humorous', 'derogatory',
      'pejorative', 'augmentative', 'diminutive', 'frequentative', 'causative', 'reflexive',
      'reciprocal', 'passive', 'impersonal', 'deponent', 'defective', 'irregular'
    ];

    // Extract and clean etymology keywords
    const etymologyKeywords = [];
    if (etymology) {
      // Use regex to find potential language/term matches
      const potentialMatches = etymology.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g) || [];

      for (const match of potentialMatches) {
        const normalizedMatch = match.trim();

        // Check for valid languages (exact match)
        const languageMatch = validLanguages.find(lang =>
          normalizedMatch.toLowerCase() === lang.toLowerCase()
        );

        if (languageMatch) {
          etymologyKeywords.push(`etymology: ${languageMatch}`);
          continue;
        }

        // Check for valid lexicographic terms (exact match)
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
    console.log("Extracted keywords:", uniqueKeywords);

    // Extract senses and examples
    const senses = [];
    const meaningSection = document.querySelector('section#meaning_and_use');
    if (meaningSection) {
      const senseBlocks = meaningSection.querySelectorAll('.senses-list .item.sense, .senses-list .item.subsense');
      console.log("Found sense blocks:", senseBlocks.length);

      senseBlocks.forEach(block => {
        const senseId = block.querySelector('.item-enumerator')?.textContent.trim() || "unknown";
        const definitionDiv = block.querySelector('.definition');
        let definition = definitionDiv ? definitionDiv.textContent.trim() : "";
        definition = definition.replace(/^Summary/i, '').trim();

        const examples = [];
        const quotationBlocks = block.querySelectorAll('.quotation-block-wrapper .quotation');
        console.log(`Processing sense ${senseId} with ${quotationBlocks.length} examples`);

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
    console.log("Found senses:", senses.length);

    // Generate CSV
    let csv = "lemma,sense_id,definition,etymology,etymology_keywords,example_date,example_source,example_content\n";
    senses.forEach(sense => {
      if (sense.examples.length === 0) {
        // Add a row even if there are no examples
        const row = `"${lemma}","${sense.senseId}","${sense.definition.replace(/"/g, '""')}","${etymology.replace(/"/g, '""')}","${uniqueKeywords.join(', ')}","","",""`;
        csv += row + "\n";
      } else {
        sense.examples.forEach(example => {
          const row = `"${lemma}","${sense.senseId}","${sense.definition.replace(/"/g, '""')}","${etymology.replace(/"/g, '""')}","${uniqueKeywords.join(', ')}","${example.date}","${example.source.replace(/"/g, '""')}","${example.content.replace(/"/g, '""')}"`;
          csv += row + "\n";
        });
      }
    });

    console.log("Generated CSV preview:", csv.substring(0, 200));

    // Send the result to the background script
    chrome.runtime.sendMessage({
      action: "scrapeResult",
      lemma: lemma,
      csv: csv
    });
  }
});