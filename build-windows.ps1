$ErrorActionPreference = "Stop"

$outputPath = Join-Path $PSScriptRoot "AtTable.exe"
$temporaryPath = Join-Path $PSScriptRoot ("AtTable.build-" + [guid]::NewGuid().ToString("N") + ".exe")
$previousPath = "$temporaryPath.previous"
$source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;

internal static class Program
{
    private const uint MessageBoxIconError = 0x10;
    private static long lastRequestTicks;

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

    private static string ContentType(string path)
    {
        switch (Path.GetExtension(path).ToLowerInvariant())
        {
            case ".css": return "text/css; charset=utf-8";
            case ".html": return "text/html; charset=utf-8";
            case ".js": return "text/javascript; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".svg": return "image/svg+xml";
            case ".ico": return "image/x-icon";
            case ".woff": return "font/woff";
            case ".woff2": return "font/woff2";
            default: return "application/octet-stream";
        }
    }

    private static void WriteResponse(NetworkStream stream, int status, byte[] bytes, string contentType)
    {
        string reason = status == 200 ? "OK" : status == 204 ? "No Content" : status == 404 ? "Not Found" : status == 405 ? "Method Not Allowed" : "Internal Server Error";
        byte[] header = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: " + contentType + "\r\nContent-Length: " + bytes.Length + "\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n");
        stream.Write(header, 0, header.Length);
        if (bytes.Length > 0) stream.Write(bytes, 0, bytes.Length);
        stream.Flush();
    }

    private static void ServeRequests(TcpListener listener, string root, string routePrefix)
    {
        string rootPath = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        while (true)
        {
            TcpClient client;
            try { client = listener.AcceptTcpClient(); }
            catch { break; }

            Interlocked.Exchange(ref lastRequestTicks, DateTime.UtcNow.Ticks);
            using (client)
            {
                try
                {
                    NetworkStream stream = client.GetStream();
                    StreamReader reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true);
                    string requestLine = reader.ReadLine();
                    if (String.IsNullOrEmpty(requestLine)) continue;
                    string[] requestParts = requestLine.Split(' ');
                    if (requestParts.Length < 2) { WriteResponse(stream, 400, new byte[0], "text/plain"); continue; }
                    string method = requestParts[0];
                    string path = requestParts[1].Split('?')[0];
                    string headerLine;
                    while (!String.IsNullOrEmpty(headerLine = reader.ReadLine())) { }

                    if (path == routePrefix + "__health") { WriteResponse(stream, 204, new byte[0], "text/plain"); continue; }
                    if (!path.StartsWith(routePrefix, StringComparison.Ordinal)) { WriteResponse(stream, 404, new byte[0], "text/plain"); continue; }
                    if (method != "GET" && method != "HEAD") { WriteResponse(stream, 405, new byte[0], "text/plain"); continue; }

                    string relative = Uri.UnescapeDataString(path.Substring(routePrefix.Length)).Replace('/', Path.DirectorySeparatorChar);
                    if (String.IsNullOrEmpty(relative)) relative = "index.html";
                    string filePath = Path.GetFullPath(Path.Combine(rootPath, relative));
                    if (!filePath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase) || !File.Exists(filePath)) { WriteResponse(stream, 404, new byte[0], "text/plain"); continue; }
                    byte[] content = method == "HEAD" ? new byte[0] : File.ReadAllBytes(filePath);
                    WriteResponse(stream, 200, content, ContentType(filePath));
                }
                catch
                {
                    try { WriteResponse(client.GetStream(), 500, new byte[0], "text/plain"); }
                    catch { }
                }
            }
        }
    }

    private static string StartLocalServer(string root)
    {
        const int port = 48173;
        string token = Guid.NewGuid().ToString("N");
        string routePrefix = "/" + token + "/";
        TcpListener listener = new TcpListener(System.Net.IPAddress.Loopback, port);
        listener.Start();
        Interlocked.Exchange(ref lastRequestTicks, DateTime.UtcNow.Ticks);
        Thread server = new Thread(() => ServeRequests(listener, root, routePrefix));
        server.IsBackground = true;
        server.Start();
        return "http://127.0.0.1:" + port + routePrefix;
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

            string appUrl = StartLocalServer(AppDomain.CurrentDomain.BaseDirectory);
            Process.Start(new ProcessStartInfo(browserPath, "\"" + appUrl + "\"") { UseShellExecute = false });
            while (DateTime.UtcNow.Ticks - Interlocked.Read(ref lastRequestTicks) < TimeSpan.FromMinutes(10).Ticks)
                Thread.Sleep(1000);
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

try {
    Add-Type -TypeDefinition $source -OutputType WindowsApplication -OutputAssembly $temporaryPath
    if (Test-Path $outputPath) {
        [System.IO.File]::Replace($temporaryPath, $outputPath, $previousPath)
        Remove-Item $previousPath -Force
    }
    else {
        [System.IO.File]::Move($temporaryPath, $outputPath)
    }
    Write-Host "Lanceur créé : $outputPath"
}
finally {
    if (Test-Path $temporaryPath) {
        Remove-Item $temporaryPath -Force
    }
    if (Test-Path $previousPath) {
        Remove-Item $previousPath -Force
    }
}