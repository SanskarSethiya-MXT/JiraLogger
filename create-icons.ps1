# Create Test Icons for Chrome Extension
# This script creates simple PNG icons for testing purposes

Write-Host "Creating test icons for Chrome Extension..." -ForegroundColor Cyan

Add-Type -AssemblyName System.Drawing

function Create-TestIcon {
    param(
        [int]$size,
        [string]$filename
    )
    
    try {
        $bitmap = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Set high quality rendering
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
        
        # Blue background (Jira blue)
        $graphics.Clear([System.Drawing.Color]::FromArgb(0, 82, 204))
        
        # White text
        $fontSize = [Math]::Max(8, $size / 2.5)
        $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        
        # Center the text
        $text = "JL"
        $textSize = $graphics.MeasureString($text, $font)
        $x = ($size - $textSize.Width) / 2
        $y = ($size - $textSize.Height) / 2
        
        $graphics.DrawString($text, $font, $brush, $x, $y)
        
        # Save the icon
        $iconPath = Join-Path $PSScriptRoot "public\icons\$filename"
        $bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        Write-Host "[OK] Created $filename ($size x $size)" -ForegroundColor Green
        
        # Cleanup
        $graphics.Dispose()
        $bitmap.Dispose()
        $font.Dispose()
        $brush.Dispose()
        
        return $true
    }
    catch {
        Write-Host "[ERROR] Failed to create $filename : $_" -ForegroundColor Red
        return $false
    }
}

# Ensure the icons directory exists
$iconsDir = Join-Path $PSScriptRoot "public\icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
    Write-Host "Created icons directory" -ForegroundColor Yellow
}

# Create the three required icon sizes
$success = @(
    (Create-TestIcon -size 16 -filename "icon16.png"),
    (Create-TestIcon -size 48 -filename "icon48.png"),
    (Create-TestIcon -size 128 -filename "icon128.png")
)

Write-Host ""
if ($success -notcontains $false) {
    Write-Host "All test icons created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run: npm install" -ForegroundColor White
    Write-Host "2. Run: npm run build:extension" -ForegroundColor White
    Write-Host "3. Load the extension from the dist-extension folder" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: These are temporary test icons." -ForegroundColor Yellow
    Write-Host "See public\icons\ICON-CREATION-GUIDE.md for creating professional icons." -ForegroundColor Yellow
}
else {
    Write-Host "Some icons failed to create. Please check the errors above." -ForegroundColor Red
}
