// Lazy load PDF libraries only when needed
let pdfjsLibPromise = null;
let jsPDFPromise = null;

/**
 * Get configuration from window object
 */
function getConfig() {
    const config = window.filamentPdfSanitizerConfig || {
        workerPath: '/vendor/filament-pdf-sanitizer/pdf.worker.min.js',
        scale: 1.5,
        quality: 0.85,
        maxFileSizeMb: null,
        maxPages: null,
        showProgress: true,
        logErrors: true,
    };

    // Ensure boolean values are actually booleans (Blade @js might convert them)
    return {
        ...config,
        showProgress: config.showProgress === true || config.showProgress === 'true' || config.showProgress === 1,
        logErrors: config.logErrors === true || config.logErrors === 'true' || config.logErrors === 1,
    };
}

/**
 * Log error if logging is enabled
 */
function logError(message, error = null) {
    const config = getConfig();
    if (config.logErrors) {
        const errorDetails = error instanceof Error ? error.message : (error || '');
        console.error('[Filament PDF Sanitizer]', message, errorDetails);
        if (error instanceof Error && error.stack) {
            console.error('[Filament PDF Sanitizer] Stack:', error.stack);
        }
    }
}

/**
 * Log warning if logging is enabled
 */
function logWarning(message) {
    const config = getConfig();
    if (config.logErrors) {
        console.warn('[Filament PDF Sanitizer]', message);
    }
}

/**
 * Log info if logging is enabled
 */
function logInfo(message) {
    const config = getConfig();
    if (config.logErrors) {
        console.log('[Filament PDF Sanitizer]', message);
    }
}

/**
 * Check if file is a PDF
 */
function isPdfFile(file) {
    if (!file) return false;
    return file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Check file size limit
 */
function checkFileSize(file) {
    const config = getConfig();
    if (config.maxFileSizeMb && file.size > config.maxFileSizeMb * 1024 * 1024) {
        return {
            valid: false,
            message: `PDF file exceeds maximum size of ${config.maxFileSizeMb}MB`,
        };
    }
    return { valid: true };
}

/**
 * Show progress indicator
 */
function showProgress(input, message = 'Sanitizing PDF...') {
    const config = getConfig();
    if (!config.showProgress) {
        logInfo('Progress indicator disabled in config');
        return null;
    }

    if (!input) {
        logWarning('Cannot show progress: input element is null');
        return null;
    }

    logInfo(`Attempting to show progress indicator for input: ${input.name || input.id || 'unnamed'}`);

    // Find Filament FileUpload wrapper (prioritize Filament-specific classes)
    let element = input;
    let wrapper = null;
    let attempts = 0;
    const maxAttempts = 15;

    // Priority order: FileUpload wrapper > Field wrapper > Input wrapper
    const prioritySelectors = [
        'fi-fo-file-upload-wrapper',
        'fi-fo-field-wrp',
        'fi-input-wrp',
        'fi-input'
    ];

    while (element && attempts < maxAttempts) {
        // Check priority selectors first
        for (const className of prioritySelectors) {
            if (element.classList?.contains(className)) {
                const rect = element.getBoundingClientRect();
                // Must have visible dimensions
                if (rect.width > 0 && rect.height > 0) {
                    wrapper = element;
                    break;
                }
            }
        }

        if (wrapper) break;

        // Fallback: check for div containers with reasonable size
        if (element.tagName === 'DIV' && element.classList.length > 0) {
            const rect = element.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 50) {
                wrapper = element;
                break;
            }
        }

        element = element.parentElement;
        attempts++;
    }

    // Fallback: use the input's parent or create a wrapper
    if (!wrapper) {
        wrapper = input.parentElement;
        if (!wrapper || wrapper === document.body) {
            // Create a wrapper div
            wrapper = document.createElement('div');
            wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';
            input.parentNode?.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }
    }

    logInfo(`Found wrapper element: ${wrapper.tagName}.${wrapper.className}`);

    // Ensure wrapper has relative positioning
    const wrapperPosition = window.getComputedStyle(wrapper).position;
    if (wrapperPosition === 'static' || !wrapperPosition) {
        wrapper.style.position = 'relative';
        logInfo('Set wrapper position to relative');
    }

    // Check if progress indicator already exists
    let indicator = wrapper.querySelector('.pdf-sanitizer-progress-overlay');

    if (!indicator) {
        // Clone from template if available, otherwise create new
        const template = document.querySelector('#pdf-sanitizer-progress-template');
        const templateOverlay = template?.querySelector('.pdf-sanitizer-progress-overlay');

        if (templateOverlay) {
            indicator = templateOverlay.cloneNode(true);
            logInfo('Cloned progress indicator from template');
        } else {
            // Create new indicator matching Filament design (fallback)
            indicator = document.createElement('div');
            indicator.className = 'pdf-sanitizer-progress-overlay';
            indicator.setAttribute('data-pdf-sanitizer-indicator', 'true');
            indicator.style.cssText = `
                position: absolute;
                inset: 0;
                background: rgba(17, 24, 39, 0.75);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 50;
                border-radius: 0.5rem;
                transition: opacity 0.2s ease-in-out;
            `;

            const content = document.createElement('div');
            content.className = 'pdf-sanitizer-progress-content';
            content.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 1rem;';

            // Create Filament-style SVG spinner
            const spinner = document.createElement('div');
            spinner.className = 'pdf-sanitizer-spinner';
            spinner.style.cssText = 'width: 2rem; height: 2rem; color: rgb(59, 130, 246); flex-shrink: 0;';

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'pdf-sanitizer-spinner-svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.style.cssText = 'width: 100%; height: 100%; animation: pdf-sanitizer-spin 1s linear infinite;';

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'pdf-sanitizer-spinner-circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '12');
            circle.setAttribute('r', '10');
            circle.setAttribute('stroke', 'currentColor');
            circle.setAttribute('stroke-width', '4');
            circle.setAttribute('stroke-linecap', 'round');
            circle.setAttribute('stroke-dasharray', '32');
            circle.setAttribute('stroke-dashoffset', '32');
            circle.style.opacity = '0.25';

            svg.appendChild(circle);
            spinner.appendChild(svg);

            const messageEl = document.createElement('div');
            messageEl.className = 'pdf-sanitizer-message';
            messageEl.textContent = message;
            messageEl.style.cssText = 'font-size: 0.875rem; font-weight: 500; line-height: 1.25rem; color: rgb(249, 250, 251); text-align: center;';

            const percentEl = document.createElement('div');
            percentEl.className = 'pdf-sanitizer-percent';
            percentEl.style.cssText = 'font-size: 0.75rem; line-height: 1rem; color: rgb(156, 163, 175); font-weight: 400;';

            // Add spinner animation if not already in document
            if (!document.getElementById('pdf-sanitizer-spin-animation')) {
                const style = document.createElement('style');
                style.id = 'pdf-sanitizer-spin-animation';
                style.textContent = `
                    @keyframes pdf-sanitizer-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }

            content.appendChild(spinner);
            content.appendChild(messageEl);
            content.appendChild(percentEl);
            indicator.appendChild(content);

            logInfo('Created new progress indicator with Filament-style fallback');
        }

        wrapper.appendChild(indicator);
    }

    // Update message and ensure it's visible
    const messageEl = indicator.querySelector('.pdf-sanitizer-message');
    if (messageEl) {
        messageEl.textContent = message;
    } else {
        // If message element doesn't exist, create it (fallback)
        const content = indicator.querySelector('.pdf-sanitizer-progress-content') || indicator;
        const msgEl = document.createElement('div');
        msgEl.className = 'pdf-sanitizer-message';
        msgEl.textContent = message;
        msgEl.style.cssText = 'font-size: 0.875rem; font-weight: 500; line-height: 1.25rem; text-align: center;';
        content.appendChild(msgEl);
    }

    // Show the indicator and set loading state
    indicator.style.display = 'flex';
    indicator.style.visibility = 'visible';

    // Set Filament-compatible loading state attribute
    wrapper.setAttribute('data-pdf-sanitizing', 'true');

    // Apply loading styles (CSS will handle pointer-events and opacity)
    wrapper.style.pointerEvents = 'none';
    wrapper.style.opacity = '0.7';

    logInfo(`Progress indicator displayed on wrapper: ${wrapper.tagName}.${wrapper.className}`);

    return indicator;
}

/**
 * Hide progress indicator
 */
function hideProgress(input) {
    if (!input) return;

    // Find wrapper using same logic as showProgress
    let element = input;
    let wrapper = null;
    let attempts = 0;
    const maxAttempts = 15;

    const prioritySelectors = [
        'fi-fo-file-upload-wrapper',
        'fi-fo-field-wrp',
        'fi-input-wrp',
        'fi-input'
    ];

    while (element && attempts < maxAttempts) {
        for (const className of prioritySelectors) {
            if (element.classList?.contains(className)) {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    wrapper = element;
                    break;
                }
            }
        }
        if (wrapper) break;

        if (element.tagName === 'DIV' && element.classList.length > 0) {
            const rect = element.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 50) {
                wrapper = element;
                break;
            }
        }
        element = element.parentElement;
        attempts++;
    }

    if (!wrapper) {
        wrapper = input.parentElement;
    }

    if (wrapper) {
        const indicator = wrapper.querySelector('.pdf-sanitizer-progress-overlay');
        if (indicator) {
            // Fade out animation
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.2s ease-in-out';

            setTimeout(() => {
                indicator.remove();
                wrapper.removeAttribute('data-pdf-sanitizing');
                wrapper.style.pointerEvents = '';
                wrapper.style.opacity = '';
                logInfo('Progress indicator hidden');
            }, 200);
        } else {
            // Clean up attributes even if indicator not found
            wrapper.removeAttribute('data-pdf-sanitizing');
            wrapper.style.pointerEvents = '';
            wrapper.style.opacity = '';
        }
    }
}

/**
 * Update progress message
 */
function updateProgress(input, message, percent = null) {
    if (!input) return;

    // Find wrapper using same improved logic as showProgress
    let element = input;
    let wrapper = null;
    let attempts = 0;
    const maxAttempts = 15;

    const prioritySelectors = [
        'fi-fo-file-upload-wrapper',
        'fi-fo-field-wrp',
        'fi-input-wrp',
        'fi-input'
    ];

    while (element && attempts < maxAttempts) {
        for (const className of prioritySelectors) {
            if (element.classList?.contains(className)) {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    wrapper = element;
                    break;
                }
            }
        }
        if (wrapper) break;

        if (element.tagName === 'DIV' && element.classList.length > 0) {
            const rect = element.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 50) {
                wrapper = element;
                break;
            }
        }
        element = element.parentElement;
        attempts++;
    }

    if (!wrapper) {
        wrapper = input.parentElement;
    }

    if (wrapper) {
        const indicator = wrapper.querySelector('.pdf-sanitizer-progress-overlay');
        if (indicator) {
            const messageEl = indicator.querySelector('.pdf-sanitizer-message');
            const percentEl = indicator.querySelector('.pdf-sanitizer-percent');

            if (messageEl) {
                messageEl.textContent = message;
            }

            if (percentEl) {
                percentEl.textContent = percent !== null ? `${percent}%` : '';
            }
        }
    }
}

async function loadPdfjsLib(workerPath) {
    if (!pdfjsLibPromise) {
        pdfjsLibPromise = import('pdfjs-dist').then((pdfjsLib) => {
            // Configure worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
            return pdfjsLib;
        }).catch((error) => {
            logError('Failed to load PDF.js library', error);
            pdfjsLibPromise = null; // Reset on error
            throw error;
        });
    }
    return pdfjsLibPromise;
}

async function loadJsPDF() {
    if (!jsPDFPromise) {
        jsPDFPromise = import('jspdf').then((module) => module.jsPDF).catch((error) => {
            logError('Failed to load jsPDF library', error);
            jsPDFPromise = null; // Reset on error
            throw error;
        });
    }
    return jsPDFPromise;
}

/**
 * Sanitize PDF by rendering pages to canvas and rebuilding
 * This completely removes all JavaScript, forms, annotations, and embedded scripts
 * by converting PDF pages to images and back to PDF
 */
export async function sanitizePdf(file, options = {}) {
    if (!isPdfFile(file)) {
        return file; // Return as-is if not a PDF
    }

    const config = getConfig();
    logInfo(`Config loaded - showProgress: ${config.showProgress}, logErrors: ${config.logErrors}`);

    const {
        workerPath = config.workerPath,
        scale = config.scale,
        quality = config.quality,
        maxFileSizeMb = config.maxFileSizeMb,
        maxPages = config.maxPages,
        onProgress = null,
    } = options;

    // Check file size
    const sizeCheck = checkFileSize(file);
    if (!sizeCheck.valid) {
        logWarning(sizeCheck.message);
        return file; // Return original file if size check fails
    }

    logInfo(`Processing PDF: ${file.name}, Pages: checking...`);

    try {
        // Dynamically load libraries only when needed
        const [pdfjsLib, jsPDF] = await Promise.all([
            loadPdfjsLib(workerPath),
            loadJsPDF()
        ]);

        // Read the PDF file
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF with pdfjsLib
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        // Check page limit
        if (maxPages && numPages > maxPages) {
            logWarning(`PDF has ${numPages} pages, exceeding limit of ${maxPages}. Skipping sanitization.`);
            return file;
        }

        // Create new PDF with jsPDF
        const outputPdf = new jsPDF({ unit: 'px', compress: true });
        let firstPage = true;

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            if (onProgress) {
                onProgress(pageNum, numPages, `Processing page ${pageNum} of ${numPages}...`);
            }

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            // Create canvas to render the page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            // Convert canvas to image
            const imgData = canvas.toDataURL('image/jpeg', quality);

            // Add page to output PDF
            if (!firstPage) {
                outputPdf.addPage();
            }
            firstPage = false;

            // Add image to PDF (convert pixels to mm for jsPDF)
            const widthMm = (viewport.width * 0.264583);
            const heightMm = (viewport.height * 0.264583);
            outputPdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm);

            // Clean up canvas to free memory
            canvas.width = 0;
            canvas.height = 0;
        }

        // Generate sanitized PDF bytes
        const pdfBytes = outputPdf.output('arraybuffer');

        // Create a new File object with the sanitized PDF
        const sanitizedFile = new File(
            [pdfBytes],
            file.name,
            {
                type: 'application/pdf',
                lastModified: Date.now(),
            }
        );

        logInfo(`PDF sanitization successful: ${file.name} -> ${sanitizedFile.name} (${(sanitizedFile.size / 1024 / 1024).toFixed(2)} MB)`);
        return sanitizedFile;
    } catch (error) {
        logError('PDF sanitization failed', error);
        // If sanitization fails, return original file
        return file;
    }
}

// Track if sanitization is already initialized to prevent duplicate setup
let isInitialized = false;

/**
 * Setup PDF sanitization for Livewire file uploads
 */
export function setupPdfSanitization(options = {}) {
    // Prevent duplicate initialization
    if (isInitialized) {
        return;
    }

    isInitialized = true;

    const config = getConfig();
    const workerPath = options.workerPath || config.workerPath;

    // Wait for Livewire to be ready
    if (typeof window.Livewire === 'undefined') {
        document.addEventListener('livewire:init', () => {
            initSanitization(workerPath);
        });
    } else {
        initSanitization(workerPath);
    }
}

function initSanitization(workerPath) {
    const config = getConfig();
    logInfo('Initializing PDF sanitization...');
    logInfo(`Configuration: showProgress=${config.showProgress}, logErrors=${config.logErrors}, workerPath=${workerPath}`);

    // Verify template is available
    const template = document.querySelector('#pdf-sanitizer-progress-template');
    if (template) {
        logInfo('Progress indicator template found in DOM');
    } else {
        logWarning('Progress indicator template NOT found in DOM - will use fallback creation');
    }

    // Store sanitized files for upload interception
    const sanitizedFilesCache = new WeakMap();
    const processingFiles = new WeakSet();

    // Expose test function for debugging
    window.testPdfSanitizerProgress = function (inputSelector = 'input[type="file"][data-pdf-sanitize="true"]') {
        const input = document.querySelector(inputSelector);
        if (!input) {
            console.error('No input found with selector:', inputSelector);
            return;
        }
        console.log('Testing progress indicator on:', input);
        const indicator = showProgress(input, 'Test: Sanitizing PDF...');
        if (indicator) {
            console.log('Progress indicator created successfully');
            setTimeout(() => {
                hideProgress(input);
                console.log('Progress indicator hidden');
            }, 3000);
        } else {
            console.error('Failed to create progress indicator');
        }
    };

    // Helper function to sanitize a file with progress
    async function sanitizeFileWithProgress(file, input) {
        if (processingFiles.has(file)) {
            // Already processing, wait for it
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (sanitizedFilesCache.has(file)) {
                        clearInterval(checkInterval);
                        resolve(sanitizedFilesCache.get(file));
                    }
                }, 100);
            });
        }

        processingFiles.add(file);

        logInfo(`Starting sanitization for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        const progressIndicator = showProgress(input, 'Sanitizing PDF...');

        if (!progressIndicator && getConfig().showProgress) {
            logWarning('Progress indicator could not be created - wrapper element not found');
        }

        try {
            const sanitized = await sanitizePdf(file, {
                workerPath,
                onProgress: (current, total, message) => {
                    updateProgress(input, message, Math.round((current / total) * 100));
                },
            });

            sanitizedFilesCache.set(file, sanitized);
            logInfo(`Sanitization completed for file: ${file.name}`);
            return sanitized;
        } catch (error) {
            logError(`Sanitization failed for file: ${file.name}`, error);
            throw error;
        } finally {
            processingFiles.delete(file);
            hideProgress(input);
        }
    }

    // Intercept Livewire's upload requests
    if (window.Livewire) {
        // Intercept fetch requests (primary method for Livewire v3+)
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = args[0];
            const options = args[1] || {};

            // Check if this is a Livewire file upload request
            const isUploadRequest = typeof url === 'string' &&
                (url.includes('/livewire/upload-file') ||
                    url.includes('/livewire/') ||
                    (options.body instanceof FormData));

            if (isUploadRequest && options.body instanceof FormData) {
                const originalFormData = options.body;
                const entries = Array.from(originalFormData.entries());
                const sanitizedEntries = [];
                let needsSanitization = false;

                for (const [key, value] of entries) {
                    if (value instanceof File && isPdfFile(value)) {
                        // Find the input element that corresponds to this file
                        const input = document.querySelector(`input[type="file"][name="${key}"], input[type="file"][data-pdf-sanitize="true"]`);

                        // Only sanitize if input is marked for sanitization
                        if (!input || !shouldSanitizeInput(input)) {
                            sanitizedEntries.push([key, value]);
                            continue;
                        }

                        needsSanitization = true;
                        let sanitized;

                        if (sanitizedFilesCache.has(value)) {
                            sanitized = sanitizedFilesCache.get(value);
                        } else {
                            sanitized = await sanitizeFileWithProgress(value, input);
                        }

                        sanitizedEntries.push([key, sanitized]);
                    } else {
                        sanitizedEntries.push([key, value]);
                    }
                }

                if (needsSanitization) {
                    const newFormData = new FormData();
                    for (const [key, value] of sanitizedEntries) {
                        if (value instanceof File) {
                            newFormData.append(key, value, value.name);
                        } else {
                            newFormData.append(key, value);
                        }
                    }
                    options.body = newFormData;
                }
            }

            return originalFetch.apply(this, args);
        };

        // Intercept XMLHttpRequest (fallback for older Livewire versions)
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this._url = url;
            return originalXHROpen.apply(this, [method, url, ...rest]);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const isUploadRequest = (this._url && typeof this._url === 'string' &&
                (this._url.includes('/livewire/upload-file') ||
                    this._url.includes('/livewire/') ||
                    body instanceof FormData));

            if (isUploadRequest && body instanceof FormData) {
                const entries = Array.from(body.entries());
                const sanitizedEntries = [];
                let needsSanitization = false;

                for (const [key, value] of entries) {
                    if (value instanceof File && isPdfFile(value)) {
                        // Find the input element that corresponds to this file
                        const input = document.querySelector(`input[type="file"][name="${key}"], input[type="file"][data-pdf-sanitize="true"]`);

                        // Only sanitize if input is marked for sanitization
                        if (!input || !shouldSanitizeInput(input)) {
                            sanitizedEntries.push([key, value]);
                            continue;
                        }

                        needsSanitization = true;
                        let sanitized;

                        if (sanitizedFilesCache.has(value)) {
                            sanitized = sanitizedFilesCache.get(value);
                        } else {
                            // This is async, so we need to handle it differently
                            const self = this;
                            (async () => {
                                const sanitized = await sanitizeFileWithProgress(value, input);
                                sanitizedFilesCache.set(value, sanitized);

                                const newFormData = new FormData();
                                for (const [k, v] of entries) {
                                    if (v === value && v instanceof File) {
                                        newFormData.append(k, sanitized, sanitized.name);
                                    } else if (v instanceof File && v !== value) {
                                        newFormData.append(k, v, v.name);
                                    } else {
                                        newFormData.append(k, v);
                                    }
                                }
                                originalXHRSend.call(self, newFormData);
                            })();
                            return; // Don't send original request
                        }

                        sanitizedEntries.push([key, sanitized]);
                    } else {
                        sanitizedEntries.push([key, value]);
                    }
                }

                if (needsSanitization && sanitizedEntries.every(([_, v]) => v instanceof File || !(v instanceof File))) {
                    const newFormData = new FormData();
                    for (const [key, value] of sanitizedEntries) {
                        if (value instanceof File) {
                            newFormData.append(key, value, value.name);
                        } else {
                            newFormData.append(key, value);
                        }
                    }
                    body = newFormData;
                }
            }

            return originalXHRSend.apply(this, [body]);
        };
    }

    /**
     * Check if an input should be sanitized
     */
    function shouldSanitizeInput(input) {
        // Only sanitize if the input has the data-pdf-sanitize attribute set to 'true'
        return input.hasAttribute('data-pdf-sanitize') &&
            input.getAttribute('data-pdf-sanitize') === 'true';
    }

    // Function to sanitize files in an input
    const sanitizeInputFiles = async (input) => {
        const files = Array.from(input.files);
        if (files.length === 0) return false;

        // Only sanitize if this input is marked for sanitization
        if (!shouldSanitizeInput(input)) return false;

        // Check if any file is a PDF
        const pdfFiles = files.filter(isPdfFile);
        if (pdfFiles.length === 0) return false;

        try {
            const sanitizedFiles = await Promise.all(
                files.map(async (file) => {
                    if (isPdfFile(file)) {
                        const sanitized = await sanitizeFileWithProgress(file, input);
                        sanitizedFilesCache.set(file, sanitized);
                        return sanitized;
                    }
                    return file;
                })
            );

            input.value = '';

            const dataTransfer = new DataTransfer();
            sanitizedFiles.forEach((file) => {
                dataTransfer.items.add(file);
            });
            input.files = dataTransfer.files;

            return true;
        } catch (error) {
            logError('Failed to sanitize input files', error);
            hideProgress(input);
            return false;
        }
    };

    // Intercept file input changes - sanitize PDFs before Livewire processes them
    document.addEventListener('change', async (e) => {
        const input = e.target;

        // Check if it's a file input with files
        if (input.type !== 'file' || !input.files || input.files.length === 0) return;

        // Skip if already sanitizing (prevent infinite loop)
        if (input.dataset.sanitizing === 'true') {
            input.dataset.sanitizing = 'false';
            return;
        }

        // Only sanitize if this input is marked for sanitization
        if (!shouldSanitizeInput(input)) return;

        // Check if any files are PDFs
        const files = Array.from(input.files);
        const hasPdf = files.some(isPdfFile);

        if (hasPdf) {
            if (input.dataset.sanitizing !== 'true') {
                input.dataset.sanitizing = 'true';
                sanitizeInputFiles(input).then(() => {
                    input.dataset.sanitizing = 'false';
                }).catch((error) => {
                    logError('Sanitization error', error);
                    input.dataset.sanitizing = 'false';
                });
            }
        }
    }, true); // Use capture phase to catch early - MUST be before Livewire's handler

    // Also hook into Livewire's morph updates for dynamically added file inputs
    if (window.Livewire) {
        window.Livewire.hook('morph.updated', ({ el }) => {
            // Find all file inputs in the updated element
            const fileInputs = el.querySelectorAll('input[type="file"]');

            fileInputs.forEach(input => {
                if (!input.dataset.sanitized) {
                    input.dataset.sanitized = 'true';

                    // Use capture phase to intercept before Livewire
                    input.addEventListener('change', async function (e) {
                        // Skip if already sanitizing (prevent infinite loop)
                        if (this.dataset.sanitizing === 'true') {
                            this.dataset.sanitizing = 'false';
                            return;
                        }

                        // Only sanitize if this input is marked for sanitization
                        if (!shouldSanitizeInput(this)) return;

                        const files = Array.from(this.files);
                        const hasPdf = files.some(isPdfFile);

                        if (hasPdf) {
                            if (this.dataset.sanitizing !== 'true') {
                                this.dataset.sanitizing = 'true';
                                sanitizeInputFiles(this).then(() => {
                                    this.dataset.sanitizing = 'false';
                                }).catch((error) => {
                                    logError('Sanitization error', error);
                                    this.dataset.sanitizing = 'false';
                                });
                            }
                        }
                    }, true); // Capture phase - runs before Livewire's handler
                }
            });
        });
    }

    // Also try to find and attach to existing file inputs
    setTimeout(() => {
        const existingInputs = document.querySelectorAll('input[type="file"]');
        existingInputs.forEach(input => {
            if (!input.dataset.sanitized) {
                input.dataset.sanitized = 'true';
            }
        });
    }, 1000);
}
