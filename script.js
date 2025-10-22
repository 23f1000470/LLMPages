// Helper function for AIpipe CORS proxy
const proxied = (u) => u && u.startsWith('http') ? `https://aipipe.org/proxy/${encodeURIComponent(u)}` : u;

// Utility functions
const stripBOM = (str) => str.replace(/^\uFEFF/, '');
const normalizeNewlines = (str) => str.replace(/\r\n|\r/g, '\n');

// Fetch with timeout and retry
async function fetchWithTimeoutAndRetry(url, timeout = 5000, retries = 3) {
    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const signal = controller.signal;
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, { signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            console.error(`Fetch attempt ${i + 1} failed:`, error);
            if (i === retries) {
                throw error; // Re-throw after all retries
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
        }
    }
}

// CSV/TSV Parser
function parseCSV(text, delimiter = null) {
    const lines = normalizeNewlines(stripBOM(text)).split('\n');
    const headers = [];
    const data = [];
    let detectedDelimiter = delimiter;

    if (!detectedDelimiter) {
        // Detect delimiter (comma or tab)
        const commaCount = lines[0]?.split(',').length || 0;
        const tabCount = lines[0]?.split('\t').length || 0;
        detectedDelimiter = commaCount > tabCount ? ',' : '\t';
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue; // Skip empty lines

        const values = [];
        let inQuotes = false;
        let current = '';

        for (let j = 0; j < line.length; j++) {
            const char = line[j];

            if (char === '"') {
                if (j > 0 && line[j - 1] === '\\') {
                    current += char; // Escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === detectedDelimiter && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        if (i === 0) {
            headers.push(...values);
        } else {
            const row = {};
            for (let k = 0; k < headers.length; k++) {
                row[headers[k]] = values[k];
            }
            data.push(row);
        }
    }
    return { headers, data };
}

// Numeric parser
function parseNumber(str) {
    if (!str) return null;
    const cleaned = str.replace(/[^\d.,-]+/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return isNaN(parsed) ? null : parsed;
}

// DOM elements
const statusEl = document.createElement('div');
statusEl.id = 'status';
statusEl.setAttribute('aria-live', 'polite');
document.body.appendChild(statusEl);
const totalSalesEl = document.createElement('div');
totalSalesEl.id = 'total-sales';
document.body.appendChild(totalSalesEl);
const dataTableEl = document.createElement('table');
dataTableEl.id = 'data-table';
dataTableEl.classList.add('table', 'table-striped', 'table-bordered');
document.body.appendChild(dataTableEl);

const urlInput = document.createElement('input');
urlInput.id = 'url-input';
urlInput.type = 'text';
urlInput.placeholder = 'Enter CSV URL';
document.body.appendChild(urlInput);

const fileInput = document.createElement('input');
fileInput.id = 'file-input';
fileInput.type = 'file';
document.body.appendChild(fileInput);

const pasteInput = document.createElement('textarea');
pasteInput.id = 'paste-input';
pasteInput.placeholder = 'Paste CSV data';
document.body.appendChild(pasteInput);

const loadBtn = document.createElement('button');
loadBtn.id = 'load-btn';
loadBtn.textContent = 'Load from URL';
loadBtn.classList.add('btn', 'btn-primary');
document.body.appendChild(loadBtn);

const pasteBtn = document.createElement('button');
pasteBtn.id = 'paste-btn';
pasteBtn.textContent = 'Paste Data';
pasteBtn.classList.add('btn', 'btn-secondary');
document.body.appendChild(pasteBtn);

const resetBtn = document.createElement('button');
resetBtn.id = 'reset-btn';
resetBtn.textContent = 'Reset';
resetBtn.classList.add('btn', 'btn-warning');
document.body.appendChild(resetBtn);

// Data processing and rendering
let dataCache = [];

function renderTable(headers, data) {
    dataTableEl.innerHTML = '';

    if (!headers || headers.length === 0 || !data || data.length === 0) {
        statusEl.textContent = 'No data to display.';
        return;
    }

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    dataTableEl.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    dataTableEl.appendChild(tbody);
}

function calculateTotal(data, column) {
    let total = 0;
    data.forEach(row => {
        const value = parseNumber(row[column]);
        if (value !== null) {
            total += value;
        }
    });
    return total;
}

function updateTotals(data, column) {
    const total = calculateTotal(data, column);
    totalSalesEl.textContent = `Total Sales: $${total.toFixed(2)}`;
}

async function loadData(source, type = 'url') {
    statusEl.textContent = 'Loading data...';
    try {
        let text;
        if (type === 'url') {
            const url = proxied(source);
            const response = await fetchWithTimeoutAndRetry(url);
            text = await response.text();
        } else if (type === 'file') {
            text = await source.text();
        } else if (type === 'paste') {
            text = source;
        }

        const { headers, data } = parseCSV(text);
        dataCache = data;
        renderTable(headers, data);
        updateTotals(data, headers[headers.length - 1]); // Assuming last header is sales
        statusEl.textContent = 'Data loaded successfully.';
    } catch (error) {
        console.error('Error loading data:', error);
        statusEl.textContent = 'Error loading data.  Falling back to local data.';
        await loadLocalData();
    }
}

async function loadLocalData() {
    try {
        const response = await fetch('./data.csv');
        const text = await response.text();
        const { headers, data } = parseCSV(text);
        dataCache = data;
        renderTable(headers, data);
        updateTotals(data, headers[headers.length - 1]);
        statusEl.textContent = 'Loaded local data.';
    } catch (error) {
        console.error('Error loading local data:', error);
        statusEl.textContent = 'Failed to load data.';
    }
}

// Event listeners
loadBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) {
        loadData(url, 'url');
    }
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        loadData(file, 'file');
    }
});

pasteBtn.addEventListener('click', () => {
    const data = pasteInput.value.trim();
    if (data) {
        loadData(data, 'paste');
    }
});

resetBtn.addEventListener('click', () => {
    dataCache = [];
    renderTable([], []);
    totalSalesEl.textContent = 'Total Sales: $0.00';
    statusEl.textContent = 'Data reset.';
});

// Initial load (local data)
loadLocalData();

// Handle URL parameter
const urlParam = new URLSearchParams(window.location.search).get('url');
if (urlParam) {
    urlInput.value = urlParam;
    loadBtn.click(); // Simulate click to load data from URL
}
