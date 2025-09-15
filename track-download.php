<?php
/**
 * Lightweight Download Tracker for QuickLoops
 * Handles both GET (direct download) and POST (JavaScript tracking) requests
 */

// Configuration
$downloads_dir = __DIR__ . '/downloads/';
$logs_dir = __DIR__ . '/logs/';
$csv_file = $logs_dir . 'downloads.csv';

// Ensure logs directory exists
if (!is_dir($logs_dir)) {
    mkdir($logs_dir, 0755, true);
}

// Handle POST request (JavaScript tracking)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($input) {
        $file = $input['file'] ?? '';
        $source = $input['source'] ?? 'direct';
        $timestamp = date('Y-m-d H:i:s');
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $user_agent = $input['userAgent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $referer = $input['referrer'] ?? $_SERVER['HTTP_REFERER'] ?? 'direct';
        
        // Parse user agent for basic browser/OS detection
        $browser = 'Unknown';
        $os = 'Unknown';
        
        if (preg_match('/Chrome\/[\d\.]+/', $user_agent)) $browser = 'Chrome';
        elseif (preg_match('/Firefox\/[\d\.]+/', $user_agent)) $browser = 'Firefox';
        elseif (preg_match('/Safari\/[\d\.]+/', $user_agent) && !preg_match('/Chrome/', $user_agent)) $browser = 'Safari';
        elseif (preg_match('/Edge\/[\d\.]+/', $user_agent)) $browser = 'Edge';
        
        if (preg_match('/Macintosh/', $user_agent)) $os = 'macOS';
        elseif (preg_match('/Windows/', $user_agent)) $os = 'Windows';
        elseif (preg_match('/Linux/', $user_agent)) $os = 'Linux';
        elseif (preg_match('/iPhone|iPad/', $user_agent)) $os = 'iOS';
        elseif (preg_match('/Android/', $user_agent)) $os = 'Android';
        
        // Create CSV header if file doesn't exist
        if (!file_exists($csv_file)) {
            $header = "timestamp,file,ip_address,browser,os,country,referer,source\n";
            file_put_contents($csv_file, $header, LOCK_EX);
        }
        
        // Log the download
        $log_data = [
            $timestamp,
            $file,
            $ip_address,
            $browser,
            $os,
            'Unknown', // country
            $referer,
            $source
        ];
        
        $csv_line = '"' . implode('","', $log_data) . '"' . "\n";
        file_put_contents($csv_file, $csv_line, FILE_APPEND | LOCK_EX);
        
        // Return success response
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'message' => 'Download tracked']);
        exit;
    }
    
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
    exit;
}

// Handle GET request (direct download with redirect)
$file = $_GET['file'] ?? '';
$source = $_GET['source'] ?? 'direct';

// Validate file parameter
if (empty($file)) {
    http_response_code(400);
    die('No file specified');
}

// Security: Only allow specific files in downloads directory
$allowed_files = [
    'QuickLoops_Installer.dmg'
];

if (!in_array($file, $allowed_files)) {
    http_response_code(404);
    die('File not found');
}

$file_path = $downloads_dir . $file;

// Check if file exists
if (!file_exists($file_path)) {
    http_response_code(404);
    die('File not found');
}

// Gather tracking data
$timestamp = date('Y-m-d H:i:s');
$ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$referer = $_SERVER['HTTP_REFERER'] ?? 'direct';

// Parse user agent for basic browser/OS detection
$browser = 'Unknown';
$os = 'Unknown';

if (preg_match('/Chrome\/[\d\.]+/', $user_agent)) $browser = 'Chrome';
elseif (preg_match('/Firefox\/[\d\.]+/', $user_agent)) $browser = 'Firefox';
elseif (preg_match('/Safari\/[\d\.]+/', $user_agent) && !preg_match('/Chrome/', $user_agent)) $browser = 'Safari';
elseif (preg_match('/Edge\/[\d\.]+/', $user_agent)) $browser = 'Edge';

if (preg_match('/Macintosh/', $user_agent)) $os = 'macOS';
elseif (preg_match('/Windows/', $user_agent)) $os = 'Windows';
elseif (preg_match('/Linux/', $user_agent)) $os = 'Linux';
elseif (preg_match('/iPhone|iPad/', $user_agent)) $os = 'iOS';
elseif (preg_match('/Android/', $user_agent)) $os = 'Android';

// Country detection (simple, using IP if needed - this is basic)
$country = 'Unknown';

// Create CSV header if file doesn't exist
if (!file_exists($csv_file)) {
    $header = "timestamp,file,ip_address,browser,os,country,referer,source\n";
    file_put_contents($csv_file, $header, LOCK_EX);
}

// Log the download
$log_data = [
    $timestamp,
    $file,
    $ip_address,
    $browser,
    $os,
    $country,
    $referer,
    $source
];

$csv_line = '"' . implode('","', $log_data) . '"' . "\n";
file_put_contents($csv_file, $csv_line, FILE_APPEND | LOCK_EX);

// Set appropriate headers for file download
$file_size = filesize($file_path);
$file_mime = 'application/octet-stream';

// Set specific MIME type for DMG files
if (pathinfo($file, PATHINFO_EXTENSION) === 'dmg') {
    $file_mime = 'application/x-apple-diskimage';
}

header('Content-Type: ' . $file_mime);
header('Content-Disposition: attachment; filename="' . basename($file) . '"');
header('Content-Length: ' . $file_size);
header('Cache-Control: no-cache, must-revalidate');
header('Expires: 0');

// Output the file
readfile($file_path);
exit;
?>
