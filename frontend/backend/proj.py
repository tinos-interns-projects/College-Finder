import os
import pdfplumber
import fitz
import pandas as pd

folder_path = "pdfs"

dataset = []

for filename in os.listdir(folder_path):

    if filename.endswith(".pdf"):

        pdf_path = os.path.join(folder_path, filename)

        print(f"Processing: {filename}")

        extracted = False

        # ---------- TRY TABLE EXTRACTION ----------
        try:
            with pdfplumber.open(pdf_path) as pdf:

                for page_num, page in enumerate(pdf.pages):

                    tables = page.extract_tables()

                    if tables:

                        extracted = True

                        for table in tables:

                            for row in table:

                                if row:

                                    cleaned_row = [
                                        str(cell).replace("\n", " ")
                                        if cell else ""
                                        for cell in row
                                    ]

                                    dataset.append({
                                        "file": filename,
                                        "page": page_num + 1,
                                        "type": "table",
                                        "content": cleaned_row
                                    })

        except Exception as e:
            print("Table extraction error:", e)

        # ---------- IF NO TABLES, EXTRACT TEXT ----------
        if not extracted:

            try:
                doc = fitz.open(pdf_path)

                for page_num in range(len(doc)):

                    page = doc.load_page(page_num)

                    text = page.get_text()

                    dataset.append({
                        "file": filename,
                        "page": page_num + 1,
                        "type": "text",
                        "content": text.strip()
                    })

            except Exception as e:
                print("Text extraction error:", e)

# ---------- CREATE DATAFRAME ----------
df = pd.DataFrame(dataset)

# ---------- SAVE CSV ----------
df.to_csv("final_dataset.csv", index=False)

print("Dataset created successfully!")