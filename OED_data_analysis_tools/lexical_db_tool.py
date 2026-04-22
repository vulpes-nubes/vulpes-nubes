import sqlite3
import pandas as pd
from tkinter import *
from tkinter import ttk, messagebox

# Initialize database
conn = sqlite3.connect('verbs.db')
cursor = conn.cursor()

# Create tables
def init_db():
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Verbs (
        verb_id INTEGER PRIMARY KEY,
        lemma TEXT UNIQUE NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Senses (
        sense_id INTEGER PRIMARY KEY,
        verb_id INTEGER,
        definition TEXT,
        etymology TEXT,
        date TEXT,
        FOREIGN KEY (verb_id) REFERENCES Verbs (verb_id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Keywords (
        keyword_id INTEGER PRIMARY KEY,
        keyword TEXT UNIQUE NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Sense_Keywords (
        sense_id INTEGER,
        keyword_id INTEGER,
        FOREIGN KEY (sense_id) REFERENCES Senses (sense_id),
        FOREIGN KEY (keyword_id) REFERENCES Keywords (keyword_id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Lexicalisation (
        lexicalisation_id INTEGER PRIMARY KEY,
        sense_id INTEGER,
        type TEXT,
        description TEXT,
        FOREIGN KEY (sense_id) REFERENCES Senses (sense_id)
    )
    ''')
    conn.commit()

# Data insertion functions
def add_verb(lemma):
    try:
        cursor.execute('INSERT OR IGNORE INTO Verbs (lemma) VALUES (?)', (lemma,))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        messagebox.showerror("Error", f"Failed to add verb: {e}")

def add_sense(verb_id, definition, etymology, date):
    try:
        cursor.execute('''
        INSERT INTO Senses (verb_id, definition, etymology, date)
        VALUES (?, ?, ?, ?)
        ''', (verb_id, definition, etymology, date))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        messagebox.showerror("Error", f"Failed to add sense: {e}")

def add_keyword(keyword):
    try:
        cursor.execute('INSERT OR IGNORE INTO Keywords (keyword) VALUES (?)', (keyword,))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        messagebox.showerror("Error", f"Failed to add keyword: {e}")

def link_keyword_to_sense(sense_id, keyword):
    try:
        cursor.execute('''
        INSERT INTO Sense_Keywords (sense_id, keyword_id)
        VALUES (?, (SELECT keyword_id FROM Keywords WHERE keyword = ?))
        ''', (sense_id, keyword))
        conn.commit()
    except Exception as e:
        messagebox.showerror("Error", f"Failed to link keyword: {e}")

def add_lexicalisation(sense_id, type_, description):
    try:
        cursor.execute('''
        INSERT INTO Lexicalisation (sense_id, type, description)
        VALUES (?, ?, ?)
        ''', (sense_id, type_, description))
        conn.commit()
    except Exception as e:
        messagebox.showerror("Error", f"Failed to add lexicalisation: {e}")

# Query functions
def get_senses_by_keyword(keyword):
    query = '''
    SELECT Verbs.lemma, Senses.definition, Senses.etymology, Senses.date
    FROM Verbs
    JOIN Senses ON Verbs.verb_id = Senses.verb_id
    JOIN Sense_Keywords ON Senses.sense_id = Sense_Keywords.sense_id
    JOIN Keywords ON Sense_Keywords.keyword_id = Keywords.keyword_id
    WHERE Keywords.keyword = ?
    '''
    return pd.read_sql_query(query, conn, params=(keyword,))

def get_all_verbs():
    return pd.read_sql_query('SELECT * FROM Verbs', conn)

# GUI
class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Lexical Database Tool")

        # Verb entry
        Label(root, text="Lemma:").grid(row=0, column=0)
        self.lemma_entry = Entry(root)
        self.lemma_entry.grid(row=0, column=1)

        Button(root, text="Add Verb", command=self.add_verb_gui).grid(row=0, column=2)

        # Sense entry
        Label(root, text="Definition:").grid(row=1, column=0)
        self.definition_entry = Entry(root, width=50)
        self.definition_entry.grid(row=1, column=1)

        Label(root, text="Etymology:").grid(row=2, column=0)
        self.etymology_entry = Entry(root, width=50)
        self.etymology_entry.grid(row=2, column=1)

        Label(root, text="Date:").grid(row=3, column=0)
        self.date_entry = Entry(root)
        self.date_entry.grid(row=3, column=1)

        Button(root, text="Add Sense", command=self.add_sense_gui).grid(row=3, column=2)

        # Keyword entry
        Label(root, text="Keyword:").grid(row=4, column=0)
        self.keyword_entry = Entry(root)
        self.keyword_entry.grid(row=4, column=1)

        Button(root, text="Add Keyword", command=self.add_keyword_gui).grid(row=4, column=2)

        # Lexicalisation entry
        Label(root, text="Lexicalisation Type:").grid(row=5, column=0)
        self.lex_type_entry = Entry(root)
        self.lex_type_entry.grid(row=5, column=1)

        Label(root, text="Description:").grid(row=6, column=0)
        self.lex_desc_entry = Entry(root, width=50)
        self.lex_desc_entry.grid(row=6, column=1)

        Button(root, text="Add Lexicalisation", command=self.add_lexicalisation_gui).grid(row=6, column=2)

        # Query
        Label(root, text="Query Keyword:").grid(row=7, column=0)
        self.query_entry = Entry(root)
        self.query_entry.grid(row=7, column=1)

        Button(root, text="Query", command=self.query_keyword).grid(row=7, column=2)

        # Results
        self.results_text = Text(root, height=15, width=80)
        self.results_text.grid(row=8, column=0, columnspan=3)

    def add_verb_gui(self):
        lemma = self.lemma_entry.get()
        if lemma:
            verb_id = add_verb(lemma)
            messagebox.showinfo("Success", f"Verb added with ID: {verb_id}")
            self.lemma_entry.delete(0, END)

    def add_sense_gui(self):
        verb_id = self.get_selected_verb_id()
        if verb_id:
            definition = self.definition_entry.get()
            etymology = self.etymology_entry.get()
            date = self.date_entry.get()
            if definition and etymology and date:
                sense_id = add_sense(verb_id, definition, etymology, date)
                messagebox.showinfo("Success", f"Sense added with ID: {sense_id}")
                self.definition_entry.delete(0, END)
                self.etymology_entry.delete(0, END)
                self.date_entry.delete(0, END)

    def add_keyword_gui(self):
        keyword = self.keyword_entry.get()
        if keyword:
            add_keyword(keyword)
            messagebox.showinfo("Success", "Keyword added")
            self.keyword_entry.delete(0, END)

    def add_lexicalisation_gui(self):
        sense_id = self.get_selected_sense_id()
        if sense_id:
            type_ = self.lex_type_entry.get()
            description = self.lex_desc_entry.get()
            if type_ and description:
                add_lexicalisation(sense_id, type_, description)
                messagebox.showinfo("Success", "Lexicalisation added")
                self.lex_type_entry.delete(0, END)
                self.lex_desc_entry.delete(0, END)

    def query_keyword(self):
        keyword = self.query_entry.get()
        if keyword:
            results = get_senses_by_keyword(keyword)
            self.results_text.delete(1.0, END)
            self.results_text.insert(END, results.to_string())

    def get_selected_verb_id(self):
        # In a real app, you'd select from a list; here, assume the last added verb for simplicity
        cursor.execute('SELECT verb_id FROM Verbs ORDER BY verb_id DESC LIMIT 1')
        return cursor.fetchone()[0]

    def get_selected_sense_id(self):
        # In a real app, you'd select from a list; here, assume the last added sense for simplicity
        cursor.execute('SELECT sense_id FROM Senses ORDER BY sense_id DESC LIMIT 1')
        return cursor.fetchone()[0]

# Main
if __name__ == "__main__":
    init_db()
    root = Tk()
    app = App(root)
    root.mainloop()
    conn.close()