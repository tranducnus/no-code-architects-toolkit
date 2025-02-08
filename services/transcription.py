import os
import whisper
import srt
import re
from datetime import timedelta
from whisper.utils import WriteSRT, WriteVTT
from services.file_management import download_file
import logging

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Set the default local storage directory
STORAGE_PATH = "/tmp/"

def extract_srt_portion(transcription_text):
    """
    Extracts only the SRT formatted portions from transcription output.

    Args:
        transcription_text (str): Full transcription text including SRT portions

    Returns:
        str: Extracted SRT content
    """
    # Regular expression to match timestamp lines with content
    pattern = r'\[(\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}\.\d{3})\]\s*(.*?)(?=\[\d{2}:\d{2}\.\d{3} -->|\Z)'
    matches = re.finditer(pattern, transcription_text, re.DOTALL)
    
    srt_entries = []
    counter = 1
    
    for match in matches:
        start_time = match.group(1)
        end_time = match.group(2)
        text = match.group(3).strip()
        
        if text:  # Only include entries with actual content
            # Format times to SRT format (HH:MM:SS,mmm)
            start_formatted = f"00:{start_time.replace('.', ',')}"
            end_formatted = f"00:{end_time.replace('.', ',')}"
            
            # Create SRT entry
            srt_entries.extend([
                str(counter),
                f"{start_formatted} --> {end_formatted}",
                text,
                ""  # Empty line between entries
            ])
            counter += 1
    
    return "\n".join(srt_entries).rstrip()

def process_transcription(media_url, output_type='transcript', max_chars=56, language=None, style_settings=None):
    """Transcribe media and return the transcript, SRT or ASS file path."""
    logger.info(f"Starting transcription for media URL: {media_url} with output type: {output_type}")
    input_filename = download_file(media_url, os.path.join(STORAGE_PATH, 'input_media'))
    logger.info(f"Downloaded media to local file: {input_filename}")

    try:
        model = whisper.load_model("base")
        logger.info("Loaded Whisper model")

        result = model.transcribe(input_filename, language=language)
        logger.info("Transcription completed")

        if output_type == 'transcript':
            output = result['text']
            logger.info("Generated transcript output")
        elif output_type == 'srt':
            srt_subtitles = []
            for i, segment in enumerate(result['segments'], start=1):
                start = timedelta(seconds=segment['start'])
                end = timedelta(seconds=segment['end'])
                text = segment['text'].strip()
                srt_subtitles.append(srt.Subtitle(i, start, end, text))

            output = srt.compose(srt_subtitles)
            logger.info("Generated SRT output")
        elif output_type == 'ass':
            result = model.transcribe(
                input_filename,
                word_timestamps=True,
                task='transcribe',
                verbose=False
            )
            logger.info("Transcription completed with word-level timestamps")
            # Generate ASS subtitle content
            ass_content = generate_ass_subtitle(result, max_chars)
            logger.info("Generated ASS subtitle content")
            
            # Write the ASS content to a file
            output_filename = os.path.join(STORAGE_PATH, f"{uuid.uuid4()}.{output_type}")
            with open(output_filename, 'w') as f:
               f.write(ass_content) 
            output = output_filename
            logger.info(f"Generated {output_type.upper()} output: {output}")
        else:
            raise ValueError("Invalid output type. Must be 'transcript', 'srt', or 'vtt'.")

        os.remove(input_filename)
        logger.info(f"Removed local file: {input_filename}")
        logger.info(f"Transcription successful, output type: {output_type}")
        return output
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise


def generate_ass_subtitle(result, max_chars):
    """Generate ASS subtitle content with highlighted current words, showing one line at a time."""
    logger.info("Generate ASS subtitle content with highlighted current words")
    # ASS file header
    ass_content = ""

    # Helper function to format time
    def format_time(t):
        hours = int(t // 3600)
        minutes = int((t % 3600) // 60)
        seconds = int(t % 60)
        centiseconds = int(round((t - int(t)) * 100))
        return f"{hours}:{minutes:02d}:{seconds:02d}.{centiseconds:02d}"

    max_chars_per_line = max_chars  # Maximum characters per line

    # Process each segment
    for segment in result['segments']:
        words = segment.get('words', [])
        if not words:
            continue  # Skip if no word-level timestamps

        # Group words into lines
        lines = []
        current_line = []
        current_line_length = 0
        for word_info in words:
            word_length = len(word_info['word']) + 1  # +1 for space
            if current_line_length + word_length > max_chars_per_line:
                lines.append(current_line)
                current_line = [word_info]
                current_line_length = word_length
            else:
                current_line.append(word_info)
                current_line_length += word_length
        if current_line:
            lines.append(current_line)

        # Generate events for each line
        for line in lines:
            line_start_time = line[0]['start']
            line_end_time = line[-1]['end']

            # Generate events for highlighting each word
            for i, word_info in enumerate(line):
                start_time = word_info['start']
                end_time = word_info['end']
                current_word = word_info['word']

                # Build the line text with highlighted current word
                caption_parts = []
                for w in line:
                    word_text = w['word']
                    if w == word_info:
                        # Highlight current word
                        caption_parts.append(r'{\c&H00FFFF&}' + word_text)
                    else:
                        # Default color
                        caption_parts.append(r'{\c&HFFFFFF&}' + word_text)
                caption_with_highlight = ' '.join(caption_parts)

                # Format times
                start = format_time(start_time)
                # End the dialogue event when the next word starts or at the end of the line
                if i + 1 < len(line):
                    end_time = line[i + 1]['start']
                else:
                    end_time = line_end_time
                end = format_time(end_time)

                # Add the dialogue line
                ass_content += f"Dialogue: 0,{start},{end},Default,,0,0,0,,{caption_with_highlight}\n"

    return ass_content