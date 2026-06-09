# PowerShell script to resize favicon.png using .NET System.Drawing
Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\amork\OneDrive\Desktop\akitsolution\akitsolution-store-main\public\favicon.png"
$destPath = "c:\Users\amork\OneDrive\Desktop\akitsolution\akitsolution-store-main\public\favicon_temp.png"

if (Test-Path $srcPath) {
    Write-Host "Loading source image from $srcPath"
    $src = [System.Drawing.Image]::FromFile($srcPath)
    
    # Scale to 96x96 pixels
    Write-Host "Resizing to 96x96..."
    $bmp = New-Object System.Drawing.Bitmap(96, 96)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Enable high quality interpolation
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $g.DrawImage($src, 0, 0, 96, 96)
    
    # Save as PNG
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Dispose
    $src.Dispose()
    $bmp.Dispose()
    $g.Dispose()
    
    # Replace the original favicon.png with the resized version
    Remove-Item $srcPath
    Rename-Item $destPath -NewName "favicon.png"
    
    Write-Host "Successfully resized and replaced favicon.png!"
} else {
    Write-Error "Source favicon.png not found at $srcPath"
}
