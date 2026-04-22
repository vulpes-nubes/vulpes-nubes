console.log("Content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    console.log("Scraping OED page...");

    // Extract lemma and thoroughly remove part of speech
    const h1Text = document.querySelector('span.headword')?.textContent.trim() || "unknown";
    let lemma = h1Text.split(',')[0].trim();
    lemma = lemma.replace(/\s+[a-z]+$/, '').trim();
    lemma = lemma.replace(/[\d.]+$/, '').trim();
    lemma = lemma.replace(/[^a-zA-Z0-9\-']+$/, '').trim();

    if (!lemma || lemma === "") {
      lemma = "unknown_lemma";
      console.warn("Using default lemma name: unknown_lemma");
    }
    console.log("Extracted lemma:", lemma);

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

    // First extract language origins
    if (etymology) {
      const potentialMatches = etymology.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g) || [];

      for (const match of potentialMatches) {
        const normalizedMatch = match.trim();

        // Check for valid languages (exact match)
        const languageMatch = validLanguages.find(lang =>
          normalizedMatch.toLowerCase() === lang.toLowerCase()
        );

        if (languageMatch) {
          etymologyKeywords.push(`etymology-origin: ${languageMatch}`);
        }
      }
    }

    // Now extract formation information using lexicographic terms
    if (etymology) {
      // Look for formation patterns in the etymology text
      const formationPatterns = [
        { pattern: /(?:formed|derived|created|made|from|by|through|via)\s+(?:a|an|the)?\s*([a-z]+(?:-[a-z]+)?)/gi, type: "process" },
        { pattern: /(?:by|through)\s+([a-z]+ation)/gi, type: "process" },
        { pattern: /(?:with|plus)\s+([a-z]+(?:-[a-z]+)?)/gi, type: "component" },
        { pattern: /(?:from|of)\s+([a-z]+(?:-[a-z]+)?)\s+(?:origin|formation|derivation)/gi, type: "source" }
      ];

      // Check for direct matches with our lexicographic terms
      for (const term of validLexicographicTerms) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        if (etymology.match(regex)) {
          etymologyKeywords.push(`etymology-formation: ${term}`);
        }
      }

      // Check for formation patterns
      for (const patternObj of formationPatterns) {
        const matches = etymology.match(patternObj.pattern);
        if (matches) {
          for (const match of matches) {
            // Extract the actual term from the match
            const termMatch = match.match(/([a-z]+(?:-[a-z]+)?)$/i);
            if (termMatch && termMatch[1]) {
              const term = termMatch[1].toLowerCase();

              // Check if this term is in our lexicographic terms
              if (validLexicographicTerms.some(t => t.toLowerCase() === term)) {
                etymologyKeywords.push(`etymology-formation: ${termMatch[1]}`);
              }
            }
          }
        }
      }

      // Look for common formation phrases
      const formationPhrases = [
        { phrase: "borrowed from", type: "borrowing" },
        { phrase: "derived from", type: "derivative" },
        { phrase: "formed from", type: "compound" },
        { phrase: "blend of", type: "blend" },
        { phrase: "back-formation from", type: "back-formation" },
        { phrase: "shortening of", type: "clipping" },
        { phrase: "acronym from", type: "acronym" },
        { phrase: "initialism from", type: "initialism" },
        { phrase: "affixation of", type: "affix" },
        { phrase: "prefix", type: "prefix" },
        { phrase: "suffix", type: "suffix" },
        { phrase: "infix", type: "infix" },
        { phrase: "reduplication of", type: "reduplication" },
        { phrase: "imitative of", type: "imitative" },
        { phrase: "onomatopoeic", type: "onomatopoeic" }
      ];

      for (const phraseObj of formationPhrases) {
        if (etymology.toLowerCase().includes(phraseObj.phrase.toLowerCase())) {
          etymologyKeywords.push(`etymology-formation: ${phraseObj.type}`);
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