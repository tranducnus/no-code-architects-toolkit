import os
import uuid
import requests
from urllib.parse import urlparse, parse_qs

def download_file(url, storage_path="/tmp/"):
    # Handle local file paths
    if url.startswith('file://'):
        local_path = url[7:]  # Remove 'file://' prefix
        if os.path.exists(local_path):
            return local_path
        raise FileNotFoundError(f"Local file not found: {local_path}")
        
    # Handle local paths without protocol
    if os.path.exists(url):
        return url
        
    # For HTTP/HTTPS URLs, proceed with download
    parsed_url = urlparse(url)
    query_params = parse_qs(parsed_url.query)
    
    # Use the 'id' parameter as the filename if it exists
    file_id = str(uuid.uuid4())
    
    #if not file_id:
    #    raise ValueError("Invalid URL: 'id' parameter not found in the URL")
    
    # Ensure the storage directory exists
    if not os.path.exists(storage_path):
        os.makedirs(storage_path)
    
    # Use the file ID as the filename and save it in the specified storage path
    local_filename = os.path.join(storage_path, f"{file_id}.mp4")  # Assuming mp4; adjust extension if needed
    
    # Download the file
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    with open(local_filename, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    return local_filename


def delete_old_files():
    now = time.time()
    for filename in os.listdir(STORAGE_PATH):
        file_path = os.path.join(STORAGE_PATH, filename)
        if os.path.isfile(file_path) and os.stat(file_path).st_mtime < now - 3600:
            os.remove(file_path)
