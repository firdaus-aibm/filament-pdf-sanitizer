<div 
    id="pdf-sanitizer-progress-template" 
    style="display: none;"
    data-pdf-sanitizer-template="true"
>
    <div class="pdf-sanitizer-progress-overlay">
        <div class="pdf-sanitizer-progress-content">
            <div class="pdf-sanitizer-spinner">
                <svg class="pdf-sanitizer-spinner-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle class="pdf-sanitizer-spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32">
                        <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                    </circle>
                </svg>
            </div>
            <div class="pdf-sanitizer-message">Sanitizing PDF...</div>
            <div class="pdf-sanitizer-percent"></div>
        </div>
    </div>
</div>

<style>
    /* Use Filament's design tokens and integrate with FileUpload component */
    .pdf-sanitizer-progress-overlay {
        position: absolute;
        inset: 0;
        background: rgba(var(--gray-950, 17 24 39) / 0.75);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        border-radius: calc(var(--radius-lg) - 2px);
        transition: opacity 0.2s ease-in-out;
    }

    /* Match Filament's FileUpload wrapper structure */
    .fi-fo-file-upload-wrapper .pdf-sanitizer-progress-overlay,
    .fi-fo-field-wrp .pdf-sanitizer-progress-overlay {
        border-radius: var(--radius-lg, 0.5rem);
    }

    .pdf-sanitizer-progress-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
    }

    .pdf-sanitizer-spinner {
        width: 2rem;
        height: 2rem;
        color: rgb(var(--primary-500, 59 130 246));
        flex-shrink: 0;
    }

    .pdf-sanitizer-spinner-svg {
        width: 100%;
        height: 100%;
        animation: pdf-sanitizer-spin 1s linear infinite;
    }

    .pdf-sanitizer-spinner-circle {
        opacity: 0.25;
    }

    .pdf-sanitizer-message {
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1.25rem;
        color: rgb(var(--gray-50, 249 250 251));
        text-align: center;
    }

    .pdf-sanitizer-percent {
        font-size: 0.75rem;
        line-height: 1rem;
        color: rgb(var(--gray-400, 156 163 175));
        font-weight: 400;
    }

    @keyframes pdf-sanitizer-spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    /* Ensure FileUpload wrapper has relative positioning */
    .fi-fo-file-upload-wrapper,
    .fi-fo-field-wrp,
    .fi-input-wrp {
        position: relative;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
        .pdf-sanitizer-progress-overlay {
            background: rgba(var(--gray-950, 17 24 39) / 0.9);
        }
    }

    /* Loading state - disable interactions */
    .fi-fo-file-upload-wrapper[data-pdf-sanitizing="true"] {
        pointer-events: none;
        opacity: 0.7;
    }

    .fi-fo-file-upload-wrapper[data-pdf-sanitizing="true"] * {
        cursor: wait;
    }
</style>

