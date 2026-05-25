import os
import csv
import re
from django.core.management.base import BaseCommand
from searcher.models import CollegeCourse

class Command(BaseCommand):
    help = 'Imports college course data from Claude-extracted CSV/TXT files'

    def handle(self, *args, **kwargs):
        self.stdout.write("Wiping old database rows for a fresh overwrite...")
        CollegeCourse.objects.all().delete()

        folder = "data/extracted" 
        
        if not os.path.exists(folder):
            self.stdout.write(self.style.ERROR(f"Folder '{folder}' not found. Check your path!"))
            return

        count = 0
        for file in os.listdir(folder):
            if file.endswith(".csv") or file.endswith(".txt"):
                filepath = os.path.join(folder, file)
                
                with open(filepath, "r", encoding="utf-8") as f:
                    csv_reader = csv.DictReader(f)
                    
                    for row in csv_reader:
                        if not row.get("College"):
                            continue
                        
                        # --- NEW ROBUST FEE CLEANING LOGIC ---
                        raw_fee = row.get("Total Fee (INR)", "0")
                        
                        # Strip commas, quotes, spaces, and unify hyphens
                        cleaned_fee_str = raw_fee.replace(",", "").replace('"', '').replace("–", "-").strip()
                        
                        clean_fee = 0
                        try:
                            if "-" in cleaned_fee_str:
                                # If it's a range like "15000-30000", grab the higher number
                                parts = [int(s.strip()) for s in cleaned_fee_str.split("-") if s.strip().isdigit()]
                                if parts:
                                    clean_fee = max(parts)
                            else:
                                # Pull just the numbers out if there's text attached (e.g., "300000 approx")
                                numbers = re.findall(r'\d+', cleaned_fee_str)
                                if numbers:
                                    clean_fee = int(numbers[0])
                            if clean_fee == 0 and not re.search(r'\d', raw_fee):
                                clean_fee = None
                        except Exception:
                            # Fallback just in case something wild happens
                            clean_fee = 0
                        # -------------------------------------

                        # Save directly to your SQL database
                        CollegeCourse.objects.create(
                            college=row.get("College").strip(),
                            location=row.get("Location").strip(),
                            state=row.get("State").strip(),
                            program_level=row.get("Program Level").strip(),
                            course_name=row.get("Course / Specialization").strip(),
                            total_fee=clean_fee,
                            notes=row.get("Notes", "").strip()
                        )
                        count += 1
                self.stdout.write(self.style.SUCCESS(f"Successfully loaded data from {file}"))

        self.stdout.write(self.style.SUCCESS(f"Done! Loaded {count} total courses into the database."))