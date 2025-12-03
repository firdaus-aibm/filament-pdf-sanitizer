<script>
    window.filamentPdfSanitizerConfig = {
        workerPath: @js($workerPath),
        scale: @js($scale ?? 1.5),
        quality: @js($quality ?? 0.85),
        maxFileSizeMb: @js($maxFileSizeMb ?? null),
        maxPages: @js($maxPages ?? null),
        showProgress: @js($showProgress ?? true),
        logErrors: @js($logErrors ?? true),
    };
</script>
@vite(['resources/js/vendor/filament-pdf-sanitizer/init.js'])

