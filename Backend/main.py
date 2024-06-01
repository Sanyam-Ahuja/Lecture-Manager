import os
import re

def pad_numbers_and_rename_files(directory):
    # Define the regex pattern to match the numerical part after "Part"
    pattern = re.compile(r'(\d*)', re.IGNORECASE)
    
    # List all files in the directory
    for filename in os.listdir(directory):
        if filename.endswith(".mp4"):
            # Search for the pattern in the filename
            match = pattern.search(filename)
            if match:
                # Extract the numerical part
                number = match.group(1)
                # Pad the numerical part with leading zeros
                padded_number = f"{int(number):03}"
                # Remove the "Part X" portion from the original filename
                new_filename_body = pattern.sub('', filename).strip()
                # Create the new filename
                new_filename = f"{padded_number} {new_filename_body}"
                # Ensure the new filename ends with ".mp4"
                if not new_filename.endswith(".mp4"):
                    new_filename += ".mp4"
                # Construct full file paths
                old_file_path = os.path.join(directory, filename)
                new_file_path = os.path.join(directory, new_filename)
                # Rename the file
                os.rename(old_file_path, new_file_path)
                print(f"Renamed: {filename} -> {new_filename}")

# Example usage
# g = ['IIT JEE Maths-Indefinite Integration','IIT JEE-Mathematics-Function','IIT-JEE-Mathematics-Limits']
# for names in g:
    # a = names
directory = f'//run//media//sanyamahuja//Work//study-manager-backend//lectures//Organic Chemistry//Reaction Mechanism'  # Update this to the path of your directory
pad_numbers_and_rename_files(directory)
