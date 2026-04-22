import re
import time
import random
import requests
from bs4 import BeautifulSoup
import pandas as pd
from urllib.parse import urljoin

# Configure headers and session
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.oed.com/',
}
session = requests.Session()
session.headers.update(headers)

def scrape_oed_page(url):
    """Scrape a single OED page with anti-bot measures."""
    try:
        # Random delay to avoid rate-limiting
        time.sleep(random.uniform(1, 3))

        response = session.get(url, allow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract verb
        verb = soup.find('h1').get_text(strip=True).split(',')[0] if soup.find('h1') else url.split('/')[-1]

        # Extract etymology
        etymology_section = soup.find('h2', string='Etymology')
        etymology = etymology_section.find_next('div').get_text(strip=True) if etymology_section else ""
        etymology_keywords = [f"etymology: {lang}" for lang in re.findall(r'\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b', etymology)]

        # Extract senses and examples
        senses = []
        sense_sections = soup.find_all(['h2', 'h3'], string=re.compile(r'^\d+\.'))
        for section in sense_sections:
            sense_id = section.get_text(strip=True).split('.')[0]
            definition_div = section.find_next('div')
            definition = definition_div.get_text(strip=True) if definition_div else ""

            examples = []
            if definition_div:
                for sibling in definition_div.find_next_siblings('div'):
                    if sibling.find('span', class_='date'):
                        date = sibling.find('span', class_='date').get_text(strip=True)
                        source = sibling.find('span', class_='source').get_text(strip=True) if sibling.find('span', class_='source') else ""
                        content = sibling.get_text(strip=True).replace(date, '').replace(source, '').strip()
                        examples.append({'date': date, 'source': source, 'content': content})

            senses.append({
                'sense_id': sense_id,
                'definition': definition,
                'examples': examples
            })

        return {
            'verb': verb,
            'etymology': etymology,
            'etymology_keywords': etymology_keywords,
            'senses': senses
        }
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None

def scrape_oed_urls(url_file, output_csv='oed_scraped.csv'):
    """Scrape all URLs in a text file and save to CSV."""
    with open(url_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]

    all_data = []
    for url in urls:
        print(f"Scraping {url}...")
        data = scrape_oed_page(url)
        if data:
            for sense in data['senses']:
                for example in sense['examples']:
                    all_data.append({
                        'verb': data['verb'],
                        'sense_id': sense['sense_id'],
                        'definition': sense['definition'],
                        'etymology': data['etymology'],
                        'etymology_keywords': ", ".join(data['etymology_keywords']),
                        'example_date': example['date'],
                        'example_source': example['source'],
                        'example_content': example['content']
                    })

    if all_data:
        pd.DataFrame(all_data).to_csv(output_csv, index=False)
        print(f"Scraped data saved to {output_csv}")
    else:
        print("No data scraped.")

# Usage
scrape_oed_urls('oed_urls.txt')