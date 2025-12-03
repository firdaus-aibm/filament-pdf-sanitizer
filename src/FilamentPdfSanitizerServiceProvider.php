<?php

namespace Filament\PdfSanitizer;

use Illuminate\Support\Facades\File;
use Illuminate\Support\ServiceProvider;

class FilamentPdfSanitizerServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Publish assets
        $this->publishes([
            __DIR__.'/../resources/js' => resource_path('js/vendor/filament-pdf-sanitizer'),
            __DIR__.'/../resources/views' => resource_path('views/vendor/filament-pdf-sanitizer'),
            __DIR__.'/../public' => public_path('vendor/filament-pdf-sanitizer'),
        ], 'filament-pdf-sanitizer-assets');

        // Publish config
        $this->publishes([
            __DIR__.'/../config/pdf-sanitizer.php' => config_path('pdf-sanitizer.php'),
        ], 'filament-pdf-sanitizer-config');

        // Automatically ensure PDF worker file is available in public directory
        $this->ensureWorkerFileExists();

        // Register views
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'filament-pdf-sanitizer');
    }

    /**
     * Ensure the PDF worker file exists in the public directory.
     * This automatically copies it if it doesn't exist, so users don't need to manually copy it.
     */
    protected function ensureWorkerFileExists(): void
    {
        $sourceFile = __DIR__.'/../public/pdf.worker.min.js';
        $targetDir = public_path('vendor/filament-pdf-sanitizer');
        $targetFile = $targetDir.'/pdf.worker.min.js';

        // Only copy if source exists and target doesn't exist
        if (File::exists($sourceFile) && ! File::exists($targetFile)) {
            // Ensure target directory exists
            if (! File::isDirectory($targetDir)) {
                File::makeDirectory($targetDir, 0755, true);
            }

            // Copy the worker file
            File::copy($sourceFile, $targetFile);
        }
    }

    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__.'/../config/pdf-sanitizer.php',
            'pdf-sanitizer'
        );
    }
}

