import os
import re
import pdfplumber
import pandas as pd
from collections import defaultdict

def extract_etymology(text):
    """Extract etymology section and language keywords."""
    etymology_section = re.search(r'# Etymology(.*?)## Meaning', text, re.DOTALL)
    if not etymology_section:
        return "", []
    etymology = etymology_section.group(1).strip()
    languages = re.findall(r'\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b', etymology)
    keywords = [f"etymology: {lang}" for lang in languages]
    return etymology, keywords

def extract_senses(text):
    """Extract senses, examples, and dates."""
    senses = defaultdict(list)
    sense_blocks = re.split(r'^\d+\.', text, flags=re.MULTILINE)
    for block in sense_blocks[1:]:
        lines = block.strip().split('\n')
        sense_header = lines[0].strip()
        sense_id = sense_header.split('.')[0].strip()
        definition = sense_header.split('.')[1].strip() if '.' in sense_header else sense_header
        examples = []
        for line in lines[1:]:
            if re.match(r'^\d{4}', line):
                date = re.search(r'^\d{4}', line).group()
                source = re.search(r'([A-Z][a-z]+(?: [A-Z][a-z]+)*)', line).group() if re.search(r'([A-Z][a-z]+(?: [A-Z][a-z]+)*)', line) else ""
                content = re.sub(r'^\d{4}.*?\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)', '', line).strip()
                examples.append({'date': date, 'source': source, 'content': content})
        senses[sense_id] = {'definition': definition, 'examples': examples}
    return senses

def parse_pdf(pdf_path):
    """Parse a single PDF and return structured data."""
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])

    verb = re.search(r'^([a-z-]+),', text).group(1) if re.search(r'^([a-z-]+),', text) else os.path.basename(pdf_path).split('.')[0]

    etymology, etymology_keywords = extract_etymology(text)
    senses = extract_senses(text)

    data = []
    for sense_id, sense in senses.items():
        for example in sense['examples']:
            data.append({
                'verb': verb,
                'sense_id': sense_id,
                'definition': sense['definition'],
                'etymology': etymology,
                'etymology_keywords': ", ".join(etymology_keywords),
                'example_date': example['date'],
                'example_source': example['source'],
                'example_content': example['content']
            })

    return pd.DataFrame(data)

def parse_pdfs_in_folder(folder_path, output_csv="oed_senses.csv"):
    """Parse all PDFs in a folder and output a CSV."""
    all_data = []
    for root, _, files in os.walk(folder_path):
        for file in files:
            if file.endswith('.pdf'):
                pdf_path = os.path.join(root, file)
                print(f"Parsing {pdf_path}...")
                try:
                    df = parse_pdf(pdf_path)
                    all_data.append(df)
                except Exception as e:
                    print(f"Error parsing {pdf_path}: {e}")

    if all_data:
        pd.concat(all_data).to_csv(output_csv, index=False)
        print(f"All data saved to {output_csv}")
    else:
        print("No data extracted.")

# Usage
parse_pdfs_in_folder("/media/fox/Storage/PhD-MKG/25 OED/NewOEDScrape/PDFs")