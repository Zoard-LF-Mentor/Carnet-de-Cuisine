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

    private static string FindCompatibleBrowser()
    {
        string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] candidates = {
            Path.Combine(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
            Path.Combine(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
            Path.Combine(localAppData, "Google", "Chrome", "Application", "chrome.exe")
        };

        foreach (string candidate in candidates)
        {
            if (File.Exists(candidate)) return candidate;
        }

        return null;
    }

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
            string browserPath = FindCompatibleBrowser();
            if (browserPath == null)
            {
                ShowMessage(IntPtr.Zero, "Pour enregistrer les recettes de Nathalie, installez Microsoft Edge ou Google Chrome, puis relancez À table.", "Navigateur requis", MessageBoxIconError);
                return 1;
            }

            Process.Start(new ProcessStartInfo(browserPath, "\"" + indexPath + "\"") { UseShellExecute = false });
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