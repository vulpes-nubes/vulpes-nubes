import sqlite3
import pandas as pd
from ast import literal_eval

def init_db(db_path='verbs.db'):
    """Initialize the database and create tables if they don't exist."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Verbs (
        verb_id INTEGER PRIMARY KEY AUTOINCREMENT,
        lemma TEXT UNIQUE NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Senses (
        sense_id INTEGER PRIMARY KEY AUTOINCREMENT,
        verb_id INTEGER,
        sense_number TEXT,
        definition TEXT,
        etymology TEXT,
        FOREIGN KEY (verb_id) REFERENCES Verbs (verb_id)
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
        sense_id INTEGER,
        keyword_id INTEGER,
        FOREIGN KEY (sense_id) REFERENCES Senses (sense_id),
        FOREIGN KEY (keyword_id) REFERENCES Keywords (keyword_id),
        PRIMARY KEY (sense_id, keyword_id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Examples (
        example_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sense_id INTEGER,
        date TEXT,
        source TEXT,
        content TEXT,
        FOREIGN KEY (sense_id) REFERENCES Senses (sense_id)
    )
    ''')

    conn.commit()
    return conn

def import_csv_to_db(csv_path, db_path='verbs.db'):
    """Import data from CSV to the SQLite database."""
    conn = init_db(db_path)
    cursor = conn.cursor()

    # Read CSV
    df = pd.read_csv(csv_path)

    for _, row in df.iterrows():
        # Add verb
        cursor.execute('INSERT OR IGNORE INTO Verbs (lemma) VALUES (?)', (row['verb'],))
        verb_id = cursor.execute('SELECT verb_id FROM Verbs WHERE lemma = ?', (row['verb'],)).fetchone()[0]

        # Add sense
        cursor.execute('''
        INSERT OR IGNORE INTO Senses (verb_id, sense_number, definition, etymology)
        VALUES (?, ?, ?, ?)
        ''', (verb_id, row['sense_id'], row['definition'], row['etymology']))
        sense_id = cursor.execute('SELECT sense_id FROM Senses WHERE verb_id = ? AND sense_number = ?', (verb_id, row['sense_id'])).fetchone()[0]

        # Add etymology keywords
        if pd.notna(row['etymology_keywords']):
            keywords = [kw.strip() for kw in row['etymology_keywords'].split(',')]
            for keyword in keywords:
                cursor.execute('INSERT OR IGNORE INTO Keywords (keyword) VALUES (?)', (keyword,))
                keyword_id = cursor.execute('SELECT keyword_id FROM Keywords WHERE keyword = ?', (keyword,)).fetchone()[0]
                cursor.execute('''
                INSERT OR IGNORE INTO Sense_Keywords (sense_id, keyword_id)
                VALUES (?, ?)
                ''', (sense_id, keyword_id))

        # Add example
        cursor.execute('''
        INSERT INTO Examples (sense_id, date, source, content)
        VALUES (?, ?, ?, ?)
        ''', (sense_id, row['example_date'], row['example_source'], row['example_content']))

    conn.commit()
    conn.close()
    print(f"Data imported from {csv_path} to {db_path}")

# Usage
import_csv_to_db('oed_senses.csv')