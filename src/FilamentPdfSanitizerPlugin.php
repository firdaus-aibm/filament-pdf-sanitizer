<?php

namespace Filament\PdfSanitizer;

use Filament\Panel;
use Filament\Support\Concerns\EvaluatesClosures;
use Filament\View\PanelsRenderHook;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Config;

class FilamentPdfSanitizerPlugin
{
    use EvaluatesClosures;

    protected ?string $workerPath = null;
    protected ?float $scale = null;
    protected ?float $quality = null;
    protected ?int $maxFileSizeMb = null;
    protected ?int $maxPages = null;
    protected bool $showProgress = true;
    protected bool $logErrors = true;

    public function workerPath(?string $path): static
    {
        $this->workerPath = $path;

        return $this;
    }

    public function scale(?float $scale): static
    {
        $this->scale = $scale;

        return $this;
    }

    public function quality(?float $quality): static
    {
        $this->quality = $quality;

        return $this;
    }

    public function maxFileSizeMb(?int $mb): static
    {
        $this->maxFileSizeMb = $mb;

        return $this;
    }

    public function maxPages(?int $pages): static
    {
        $this->maxPages = $pages;

        return $this;
    }

    public function showProgress(bool $show = true): static
    {
        $this->showProgress = $show;

        return $this;
    }

    public function logErrors(bool $log = true): static
    {
        $this->logErrors = $log;

        return $this;
    }

    public function getWorkerPath(): string
    {
        return $this->workerPath ?? Config::get('pdf-sanitizer.worker_path', '/vendor/filament-pdf-sanitizer/pdf.worker.min.js');
    }

    public function getScale(): float
    {
        return $this->scale ?? Config::get('pdf-sanitizer.scale', 1.5);
    }

    public function getQuality(): float
    {
        return $this->quality ?? Config::get('pdf-sanitizer.quality', 0.85);
    }

    public function getMaxFileSizeMb(): ?int
    {
        return $this->maxFileSizeMb ?? Config::get('pdf-sanitizer.max_file_size_mb');
    }

    public function getMaxPages(): ?int
    {
        return $this->maxPages ?? Config::get('pdf-sanitizer.max_pages');
    }

    public function shouldShowProgress(): bool
    {
        return $this->showProgress && Config::get('pdf-sanitizer.show_progress', true);
    }

    public function shouldLogErrors(): bool
    {
        return $this->logErrors && Config::get('pdf-sanitizer.log_errors', true);
    }

    public function isEnabled(): bool
    {
        return Config::get('pdf-sanitizer.enabled', true);
    }

    public function register(Panel $panel): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $panel->renderHook(
            PanelsRenderHook::BODY_END,
            fn (): string => Blade::render('filament-pdf-sanitizer::pdf-sanitizer-script', [
                'workerPath' => $this->getWorkerPath(),
                'scale' => $this->getScale(),
                'quality' => $this->getQuality(),
                'maxFileSizeMb' => $this->getMaxFileSizeMb(),
                'maxPages' => $this->getMaxPages(),
                'showProgress' => $this->shouldShowProgress(),
                'logErrors' => $this->shouldLogErrors(),
            ])
        );
    }
}

