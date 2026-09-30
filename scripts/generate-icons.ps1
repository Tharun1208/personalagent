Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Hp\Downloads\logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$origImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Output "Original dimensions: $($origImg.Width) x $($origImg.Height)"

# 1. Exact 1:1 Center Square Crop
$minDim = [Math]::Min($origImg.Width, $origImg.Height) # 1536
$cropX = [int](($origImg.Width - $minDim) / 2)
$cropY = [int](($origImg.Height - $minDim) / 2)

$squareBmp = New-Object System.Drawing.Bitmap($minDim, $minDim)
$gCrop = [System.Drawing.Graphics]::FromImage($squareBmp)
$gCrop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gCrop.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gCrop.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $minDim, $minDim)
$destRect = New-Object System.Drawing.Rectangle(0, 0, $minDim, $minDim)
$gCrop.DrawImage($origImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$gCrop.Dispose()
$origImg.Dispose()

Write-Output "Cropped to exact 1:1 square: $minDim x $minDim"

function Export-Icon {
    param(
        [System.Drawing.Bitmap]$SourceBmp,
        [int]$Size,
        [string]$OutPath,
        [bool]$IsRound = $false,
        [double]$PaddingRatio = 0.0
    )

    $targetBmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($targetBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($IsRound) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $Size, $Size)
        $g.SetClip($path)
    }

    $innerSize = [int]($Size * (1.0 - $PaddingRatio * 2))
    $offset = [int]($Size * $PaddingRatio)

    $g.DrawImage($SourceBmp, $offset, $offset, $innerSize, $innerSize)
    $g.Dispose()

    $dir = [System.IO.Path]::GetDirectoryName($OutPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    if (Test-Path $OutPath) {
        Remove-Item $OutPath -Force
    }

    $targetBmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetBmp.Dispose()
    Write-Output "Generated: $OutPath ($Size x $Size)"
}

$resDir = "C:\Users\Hp\Downloads\Agent\android\app\src\main\res"

$configs = @(
    @{ Folder = "mipmap-mdpi"; Standard = 48; Foreground = 108 },
    @{ Folder = "mipmap-hdpi"; Standard = 72; Foreground = 162 },
    @{ Folder = "mipmap-xhdpi"; Standard = 96; Foreground = 216 },
    @{ Folder = "mipmap-xxhdpi"; Standard = 144; Foreground = 324 },
    @{ Folder = "mipmap-xxxhdpi"; Standard = 192; Foreground = 432 }
)

foreach ($cfg in $configs) {
    $folderPath = Join-Path $resDir $cfg.Folder
    
    # 1. Standard square launcher (exact 1:1 fill)
    Export-Icon -SourceBmp $squareBmp -Size $cfg.Standard -OutPath (Join-Path $folderPath "ic_launcher.png")
    
    # 2. Round launcher (exact 1:1 rounded)
    Export-Icon -SourceBmp $squareBmp -Size $cfg.Standard -OutPath (Join-Path $folderPath "ic_launcher_round.png") -IsRound $true
    
    # 3. Adaptive foreground layer (safe zone with 15% margin for Android adaptive mask)
    Export-Icon -SourceBmp $squareBmp -Size $cfg.Foreground -OutPath (Join-Path $folderPath "ic_launcher_foreground.png") -PaddingRatio 0.12
}

# Web and PWA icons (exact 1:1 ratio)
Export-Icon -SourceBmp $squareBmp -Size 512 -OutPath "C:\Users\Hp\Downloads\Agent\public\logo.png"
Export-Icon -SourceBmp $squareBmp -Size 512 -OutPath "C:\Users\Hp\Downloads\Agent\public\icon.png"
Export-Icon -SourceBmp $squareBmp -Size 192 -OutPath "C:\Users\Hp\Downloads\Agent\public\icon-192.png"
Export-Icon -SourceBmp $squareBmp -Size 180 -OutPath "C:\Users\Hp\Downloads\Agent\public\apple-touch-icon.png"

$squareBmp.Dispose()
Write-Output "1:1 square cropped icons generated successfully!"
