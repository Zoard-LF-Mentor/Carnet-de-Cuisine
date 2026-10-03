$ErrorActionPreference = "Stop"

$outputPath = Join-Path $PSScriptRoot "AtTable.exe"
$source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;

internal static class Program
{
    private const uint MessageBoxIconError = 0x10;

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "MessageBoxW")]
    private static extern int ShowMessage(IntPtr owner, string text, string caption, uint type);

    [STAThread]
    private static int Main()
    {
        string indexPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "index.html");
        if (!File.Exists(indexPath))
        {
            ShowMessage(IntPtr.Zero, "Placez AtTable.exe dans le même dossier que index.html.", "À table", MessageBoxIconError);
            return 1;
        }

        try
        {
            Process.Start(new ProcessStartInfo(indexPath) { UseShellExecute = true });
            return 0;
        }
        catch (Exception error)
        {
            ShowMessage(IntPtr.Zero, "Impossible d'ouvrir l'application dans votre navigateur." + Environment.NewLine + error.Message, "À table", MessageBoxIconError);
            return 1;
        }
    }
}
'@

if (Test-Path $outputPath) {
    Remove-Item $outputPath -Force
}

Add-Type -TypeDefinition $source -OutputType WindowsApplication -OutputAssembly $outputPath
Write-Host "Lanceur créé : $outputPath"