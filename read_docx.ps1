Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("Daily Activity Time sheet updated 2026 (1).docx")
$entry = $zip.GetEntry("word/document.xml")
$reader = New-Object System.IO.StreamReader($entry.Open())
$content = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()

# Find table area - extract around the first w:tbl
$tblIdx = $content.IndexOf("<w:tbl")
if ($tblIdx -ge 0) {
    $tableSection = $content.Substring($tblIdx, 12000)
    Write-Host $tableSection
}
