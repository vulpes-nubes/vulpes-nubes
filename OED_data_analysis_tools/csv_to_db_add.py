import sqlite3
import pandas as pd
import os

def import_csv_to_db(folder_path, db_path='verbs.db'):
    """Import data from all CSV files in a folder to the SQLite database, avoiding duplicates."""
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()

        # Create tables if they don't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS Lemmas (
            lemma_id INTEGER PRIMARY KEY AUTOINCREMENT,
            lemma TEXT UNIQUE NOT NULL
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS Senses (
            sense_id INTEGER PRIMARY KEY AUTOINCREMENT,
            lemma_id INTEGER NOT NULL,
            sense_number TEXT NOT NULL,
            definition TEXT,
            etymology TEXT,
            FOREIGN KEY (lemma_id) REFERENCES Lemmas (lemma_id),
            UNIQUE(lemma_id, sense_number)
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS Keywords (
            keyword_id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT UNIQUE NOT NULL
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS Sense_Keywords (
            sense_id INTEGER NOT NULL,
            keyword_id INTEGER NOT NULL,
            FOREIGN KEY (sense_id) REFERENCES Senses (sense_id),
            FOREIGN KEY (keyword_id) REFERENCES Keywords (keyword_id),
            PRIMARY KEY (sense_id, keyword_id)
        )
        ''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS Examples (
            example_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sense_id INTEGER NOT NULL,
            date TEXT,
            source TEXT,
            content TEXT,
            FOREIGN KEY (sense_id) REFERENCES Senses (sense_id),
            UNIQUE(sense_id, date, source, content)
        )
        ''')

        conn.commit()

        # Process all CSV files in the folder recursively
        processed_files = 0
        for root, _, files in os.walk(folder_path):
            for file in files:
                if file.endswith('.csv'):
                    file_path = os.path.join(root, file)
                    try:
                        print(f"Processing file: {file_path}")
                        df = pd.read_csv(file_path)

                        for _, row in df.iterrows():
                            try:
                                # Add lemma (skip if it already exists)
                                cursor.execute('INSERT OR IGNORE INTO Lemmas (lemma) VALUES (?)', (row['lemma'],))
                                lemma_result = cursor.execute('SELECT lemma_id FROM Lemmas WHERE lemma = ?', (row['lemma'],)).fetchone()
                                if not lemma_result:
                                    print(f"Failed to fetch lemma_id for lemma: {row['lemma']}")
                                    continue
                                lemma_id = lemma_result[0]

                                # Add sense (skip if this lemma+sense_number already exists)
                                cursor.execute('''
                                INSERT OR IGNORE INTO Senses (lemma_id, sense_number, definition, etymology)
                                VALUES (?, ?, ?, ?)
                                ''', (lemma_id, row['sense_id'], row['definition'], row['etymology']))

                                sense_result = cursor.execute('SELECT sense_id FROM Senses WHERE lemma_id = ? AND sense_number = ?',
                                                               (lemma_id, row['sense_id'])).fetchone()
                                if not sense_result:
                                    print(f"Failed to fetch sense_id for lemma_id: {lemma_id}, sense_number: {row['sense_id']}")
                                    continue
                                sense_id = sense_result[0]

                                # Add etymology keywords (skip if they already exist)
                                if pd.notna(row['etymology_keywords']):
                                    keywords = [kw.strip() for kw in row['etymology_keywords'].split(',')]
                                    for keyword in keywords:
                                        try:
                                            cursor.execute('INSERT OR IGNORE INTO Keywords (keyword) VALUES (?)', (keyword,))
                                            keyword_result = cursor.execute('SELECT keyword_id FROM Keywords WHERE keyword = ?', (keyword,)).fetchone()
                                            if not keyword_result:
                                                print(f"Failed to fetch keyword_id for keyword: {keyword}")
                                                continue
                                            keyword_id = keyword_result[0]
                                            cursor.execute('''
                                            INSERT OR IGNORE INTO Sense_Keywords (sense_id, keyword_id)
                                            VALUES (?, ?)
                                            ''', (sense_id, keyword_id))
                                        except sqlite3.Error as e:
                                            print(f"Error processing keyword {keyword}: {e}")

                                # Add example (skip if this sense+date+source+content already exists)
                                cursor.execute('''
                                INSERT OR IGNORE INTO Examples (sense_id, date, source, content)
                                VALUES (?, ?, ?, ?)
                                ''', (sense_id, row['example_date'], row['example_source'], row['example_content']))

                                conn.commit()
                            except sqlite3.Error as e:
                                print(f"Error processing row: {e}")
                                conn.rollback()
                        processed_files += 1
                        print(f"Successfully processed {file_path}")
                    except Exception as e:
                        print(f"Error processing file {file_path}: {e}")
                        conn.rollback()

        print(f"Processed {processed_files} CSV files from {folder_path} to {db_path}")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()

# Usage
import_csv_to_db('path to your folder containing CSV files')