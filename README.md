# Filament PDF Sanitizer

[![Latest Version](https://img.shields.io/packagist/v/laminblur/filament-pdf-sanitizer?style=flat-square)](https://packagist.org/packages/laminblur/filament-pdf-sanitizer)
[![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)](LICENSE)
[![PHP Version](https://img.shields.io/badge/php-8.2%2B-blue?style=flat-square)](https://php.net)
[![Laravel](https://img.shields.io/badge/laravel-11%2B%20%7C%2012%2B-red?style=flat-square)](https://laravel.com)
[![Filament](https://img.shields.io/badge/filament-3.x-orange?style=flat-square)](https://filamentphp.com)

A Filament plugin that automatically sanitizes PDF files by removing JavaScript, forms, annotations, and embedded scripts before upload. This prevents AWS WAF and other security systems from blocking PDF uploads that contain executable content.

## 🎯 Problem Solved

When uploading PDFs through Filament's FileUpload component, files containing embedded JavaScript or interactive elements can be blocked by security systems like AWS WAF (Web Application Firewall). This plugin automatically sanitizes PDFs client-side before upload, ensuring they pass security checks while preserving all visual content.

## ✨ Features

- 🔒 **Automatic PDF Sanitization** - Removes JavaScript, forms, and annotations from PDFs before upload
- 🚀 **Zero Configuration** - Works out of the box with Filament FileUpload components
- ⚡ **Lazy Loading** - Only loads PDF libraries when file inputs are detected (reduces initial bundle size)
- 🎯 **Transparent** - Works seamlessly with Livewire file uploads without user intervention
- 📦 **Lightweight** - Optimized bundle size with code splitting and dynamic imports
- 🔄 **Smart Caching** - Caches sanitized files to prevent re-processing on retry
- 🛡️ **WAF Compatible** - Prevents AWS WAF and other security systems from blocking uploads

## 📋 Requirements

- PHP 8.2 or higher
- Laravel 11 or 12
- Filament 3.x
- Node.js dependencies: `jspdf` and `pdfjs-dist`

## 📦 Installation

### Step 1: Install via Composer

Install the package directly from [Packagist](https://packagist.org/packages/laminblur/filament-pdf-sanitizer):

```bash
composer require laminblur/filament-pdf-sanitizer
```

### Step 2: Install NPM Dependencies

```bash
npm install jspdf pdfjs-dist
```

### Step 3: Publish Assets

```bash
php artisan vendor:publish --tag=filament-pdf-sanitizer-assets
php artisan vendor:publish --tag=filament-pdf-sanitizer-config
```

### Step 4: Copy PDF Worker File

**Windows (PowerShell):**

```powershell
Copy-Item vendor/laminblur/filament-pdf-sanitizer/public/pdf.worker.min.js public/vendor/filament-pdf-sanitizer/
```

**Linux/Mac:**

```bash
cp vendor/laminblur/filament-pdf-sanitizer/public/pdf.worker.min.js public/vendor/filament-pdf-sanitizer/
```

### Step 5: Update Vite Config (Optional)

If you want to explicitly include the package assets in your build, add to `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/css/filament/merchant/theme.css',
                'resources/js/vendor/filament-pdf-sanitizer/init.js', // Add this
            ],
            refresh: true,
        }),
    ],
});
```

### Step 6: Rebuild Assets

```bash
npm run build
```

## 🚀 Usage

### Basic Usage

Add the plugin to your Filament panel provider:

```php
<?php

namespace App\Providers\Filament;

use Filament\Panel;
use Filament\PanelProvider;
use Filament\PdfSanitizer\FilamentPdfSanitizerPlugin;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->plugins([
                FilamentPdfSanitizerPlugin::make(),
                // ... other plugins
            ]);
    }
}
```

That's it! The plugin will automatically sanitize all PDF uploads in your Filament panels.

### Custom Worker Path

If you need to customize the PDF worker path:

```php
FilamentPdfSanitizerPlugin::make()
    ->workerPath('/custom/path/to/pdf.worker.min.js')
```

### Configuration

Publish and edit the config file:

```bash
php artisan vendor:publish --tag=filament-pdf-sanitizer-config
```

Edit `config/pdf-sanitizer.php`:

```php
return [
    /*
    |--------------------------------------------------------------------------
    | PDF Worker Path
    |--------------------------------------------------------------------------
    |
    | The path to the PDF.js worker file. This file is required for PDF
    | parsing and rendering.
    |
    */
    'worker_path' => '/vendor/filament-pdf-sanitizer/pdf.worker.min.js',

    /*
    |--------------------------------------------------------------------------
    | Enable PDF Sanitization
    |--------------------------------------------------------------------------
    |
    | Set to false to disable PDF sanitization globally.
    |
    */
    'enabled' => true,
];
```

## 🔧 How It Works

1. **Detection**: The plugin detects when a PDF file is selected in a file input
2. **Sanitization**: Each PDF page is rendered to a canvas, converted to a JPEG image, and rebuilt as a clean PDF
3. **Interception**: The sanitized PDF replaces the original file before the upload request is sent
4. **Caching**: Sanitized files are cached using WeakMap to prevent re-processing on retry

### What Gets Removed ❌

- JavaScript actions and event handlers
- PDF forms and interactive elements
- Annotations and comments
- Embedded objects and widgets
- Metadata scripts
- JavaScript-based links

### What Gets Preserved ✅

- Visual content (text, images, graphics)
- Page layout and formatting
- Vector graphics and drawings
- File structure and organization

## 🌐 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)

## 🐛 Troubleshooting

### PDF Worker Not Found

If you see errors about the PDF worker file:

1. Ensure assets are published:
   ```bash
   php artisan vendor:publish --tag=filament-pdf-sanitizer-assets --force
   ```

2. Copy the worker file:
   ```bash
   cp vendor/laminblur/filament-pdf-sanitizer/public/pdf.worker.min.js public/vendor/filament-pdf-sanitizer/
   ```

3. Verify the file is accessible at: `/vendor/filament-pdf-sanitizer/pdf.worker.min.js`

### Upload Still Blocked

If uploads are still being blocked:

1. ✅ Check that the plugin is registered in your panel provider
2. ✅ Verify the PDF worker file is accessible at the configured path
3. ✅ Check browser console for JavaScript errors
4. ✅ Ensure npm dependencies are installed: `npm install jspdf pdfjs-dist`
5. ✅ Rebuild assets: `npm run build`

### Build Errors

If you encounter Vite build errors:

1. Ensure JavaScript files are published to `resources/js/vendor/filament-pdf-sanitizer/`
2. Check your `vite.config.js` includes the package assets (optional)
3. Run `npm run build` to rebuild assets
4. Clear Vite cache: `rm -rf node_modules/.vite` (Linux/Mac) or `Remove-Item -Recurse -Force node_modules\.vite` (Windows)

### File Upload Not Working

If file uploads stop working:

1. Check browser console for errors
2. Verify Livewire is properly initialized
3. Ensure the plugin is only registered once (check for duplicate plugin registrations)
4. Try clearing browser cache and rebuilding assets

## 📊 Performance

- **Initial Bundle Impact**: ~0KB (lazy loaded)
- **When Active**: ~800KB (pdfjs-dist + jspdf, loaded only when PDF is detected)
- **Sanitization Time**: ~1-3 seconds per PDF (depends on page count and complexity)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open-sourced software licensed under the [MIT license](LICENSE).

## 🙏 Acknowledgments

- Built for [Filament PHP](https://filamentphp.com)
- Uses [PDF.js](https://mozilla.github.io/pdf.js/) for PDF parsing
- Uses [jsPDF](https://github.com/parallax/jsPDF) for PDF generation

## 📞 Support

For issues and questions, please [open an issue](https://github.com/laminblur/filament-pdf-sanitizer/issues) on GitHub.

## 🔗 Links

- [Packagist](https://packagist.org/packages/laminblur/filament-pdf-sanitizer)
- [GitHub Repository](https://github.com/laminblur/filament-pdf-sanitizer)
- [Filament Documentation](https://filamentphp.com/docs)
- [Report a Bug](https://github.com/laminblur/filament-pdf-sanitizer/issues)
- [Request a Feature](https://github.com/laminblur/filament-pdf-sanitizer/issues)

---

Made with ❤️ for the Filament community
