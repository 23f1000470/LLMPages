# CSV Data Viewer

This is a simple web application for viewing CSV data from various sources.

## Features

*   Loads CSV data from a URL, file upload, or pasted text.
*   Includes a fallback to a local `data.csv` file if the remote fetch fails.
*   Parses CSV with auto-detection of delimiter (comma or tab) and handles quoted cells.
*   Parses numeric values, tolerant of currency symbols and thousands separators.
*   Displays a status message to indicate loading and errors.
*   Calculates and displays the total sales (assuming the last column is sales).
*   Includes a reset button to clear the data.
*   Supports dark mode based on the user's system preference.

## Usage

1.  **URL Input:** Enter the URL of a CSV file and click "Load from URL".  Uses the AIpipe CORS proxy for cross-origin requests.
2.  **File Input:** Upload a CSV file from your computer.
3.  **Paste Input:** Paste CSV data directly into the text area and click "Paste Data".
4.  **Reset:** Click the "Reset" button to clear the data and reset the view.

## AIpipe CORS Proxy

The application uses the AIpipe CORS proxy (`https://aipipe.org/proxy/`) to fetch CSV files from external URLs. This is necessary because web browsers typically block cross-origin requests for security reasons. The proxy acts as an intermediary, allowing the application to fetch data from any domain.

## Fallback Mechanism

If the application fails to load data from the provided URL, it automatically falls back to loading a local `data.csv` file. This ensures that the application always has data to display, even if there are network issues or the remote file is unavailable.

## Files

*   `index.html`: The main HTML file.
*   `script.js`: The JavaScript file that handles data loading, parsing, and rendering.
*   `styles.css`: The CSS file for styling the page.
*   `data.csv`: A sample CSV file used for fallback.
*   `README.md`: This file.
