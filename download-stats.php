<?php
/**
 * Simple Download Analytics Dashboard
 * View download statistics for QuickLoops
 */

// Configuration
$logs_dir = __DIR__ . '/logs/';
$csv_file = $logs_dir . 'downloads.csv';

// Simple authentication (change this password!)
$admin_password = 'quickloops2024';
$auth_cookie = 'download_stats_auth';

// Check authentication
session_start();
$is_authenticated = isset($_SESSION[$auth_cookie]) && $_SESSION[$auth_cookie] === true;

if (isset($_POST['password'])) {
    if ($_POST['password'] === $admin_password) {
        $_SESSION[$auth_cookie] = true;
        $is_authenticated = true;
    } else {
        $error = 'Invalid password';
    }
}

if (isset($_GET['logout'])) {
    unset($_SESSION[$auth_cookie]);
    $is_authenticated = false;
}

if (!$is_authenticated) {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>QuickLoops Download Stats - Login</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0c0c0d; color: #fbfbfc; margin: 0; padding: 40px; }
            .login-container { max-width: 400px; margin: 100px auto; padding: 40px; background: rgba(22,22,24,0.6); border-radius: 16px; }
            h1 { text-align: center; margin-bottom: 30px; }
            input[type="password"] { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid rgba(255,255,255,0.12); background: rgba(36,36,38,0.9); color: #fbfbfc; border-radius: 8px; }
            button { width: 100%; padding: 12px; background: linear-gradient(180deg, #1f86ff, #0071e3); color: white; border: none; border-radius: 8px; cursor: pointer; }
            button:hover { opacity: 0.9; }
            .error { color: #ff6b6b; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h1>🔒 Download Stats</h1>
            <form method="POST">
                <input type="password" name="password" placeholder="Enter password" required>
                <button type="submit">Login</button>
                <?php if (isset($error)): ?>
                    <div class="error"><?= htmlspecialchars($error) ?></div>
                <?php endif; ?>
            </form>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Load and parse CSV data
$downloads = [];
if (file_exists($csv_file)) {
    $handle = fopen($csv_file, 'r');
    $header = fgetcsv($handle); // Skip header
    
    while (($data = fgetcsv($handle)) !== FALSE) {
        $downloads[] = array_combine($header, $data);
    }
    fclose($handle);
}

// Calculate statistics
$total_downloads = count($downloads);
$today = date('Y-m-d');
$this_week = date('Y-m-d', strtotime('-7 days'));
$this_month = date('Y-m-d', strtotime('-30 days'));

$downloads_today = array_filter($downloads, function($d) use ($today) {
    return strpos($d['timestamp'], $today) === 0;
});

$downloads_week = array_filter($downloads, function($d) use ($this_week) {
    return $d['timestamp'] >= $this_week;
});

$downloads_month = array_filter($downloads, function($d) use ($this_month) {
    return $d['timestamp'] >= $this_month;
});

// Browser statistics
$browsers = [];
$os_stats = [];
$countries = [];
$hourly_stats = array_fill(0, 24, 0);
$daily_stats = [];

foreach ($downloads as $download) {
    // Browser stats
    $browser = $download['browser'] ?? 'Unknown';
    $browsers[$browser] = ($browsers[$browser] ?? 0) + 1;
    
    // OS stats
    $os = $download['os'] ?? 'Unknown';
    $os_stats[$os] = ($os_stats[$os] ?? 0) + 1;
    
    // Country stats
    $country = $download['country'] ?? 'Unknown';
    $countries[$country] = ($countries[$country] ?? 0) + 1;
    
    // Hourly stats
    $hour = (int)date('H', strtotime($download['timestamp']));
    $hourly_stats[$hour]++;
    
    // Daily stats
    $date = date('Y-m-d', strtotime($download['timestamp']));
    $daily_stats[$date] = ($daily_stats[$date] ?? 0) + 1;
}

// Sort stats
arsort($browsers);
arsort($os_stats);
arsort($countries);
ksort($daily_stats);

?>
<!DOCTYPE html>
<html>
<head>
    <title>QuickLoops Download Analytics</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0c0c0d;
            color: #fbfbfc;
            margin: 0;
            padding: 20px;
            line-height: 1.5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            background: linear-gradient(135deg, #1f86ff, #0071e3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(22,22,24,0.6);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.12);
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
            background: linear-gradient(135deg, #1f86ff, #0071e3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stat-label {
            color: #a8a8ad;
            font-size: 0.9rem;
        }
        .chart-section {
            margin: 30px 0;
        }
        .chart-section h3 {
            margin-bottom: 15px;
        }
        .chart-container {
            background: rgba(22,22,24,0.6);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.12);
        }
        .bar-chart {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .bar-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .bar-label {
            min-width: 80px;
            font-size: 0.9rem;
        }
        .bar {
            height: 20px;
            background: linear-gradient(90deg, #1f86ff, #0071e3);
            border-radius: 4px;
            position: relative;
        }
        .bar-value {
            position: absolute;
            right: 8px;
            color: white;
            font-size: 0.8rem;
            line-height: 20px;
        }
        .recent-downloads {
            margin-top: 30px;
        }
        .download-table {
            width: 100%;
            background: rgba(22,22,24,0.6);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.12);
        }
        .download-table th,
        .download-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .download-table th {
            background: rgba(36,36,38,0.9);
            font-weight: 600;
        }
        .download-table td {
            font-size: 0.9rem;
        }
        .logout-link {
            float: right;
            color: #a8a8ad;
            text-decoration: none;
            font-size: 0.9rem;
        }
        .logout-link:hover {
            color: #fbfbfc;
        }
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            .download-table {
                font-size: 0.8rem;
            }
            .download-table th,
            .download-table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="?logout=1" class="logout-link">Logout</a>
        <h1>📊 QuickLoops Download Analytics</h1>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?= number_format($total_downloads) ?></div>
                <div class="stat-label">Total Downloads</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= count($downloads_today) ?></div>
                <div class="stat-label">Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= count($downloads_week) ?></div>
                <div class="stat-label">This Week</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= count($downloads_month) ?></div>
                <div class="stat-label">This Month</div>
            </div>
        </div>

        <?php if ($total_downloads > 0): ?>
        <div class="chart-section">
            <h3>Operating Systems</h3>
            <div class="chart-container">
                <div class="bar-chart">
                    <?php 
                    $max_os = max($os_stats);
                    foreach (array_slice($os_stats, 0, 5) as $os => $count): 
                        $width = ($count / $max_os) * 100;
                    ?>
                    <div class="bar-item">
                        <div class="bar-label"><?= htmlspecialchars($os) ?></div>
                        <div class="bar" style="width: <?= $width ?>%">
                            <div class="bar-value"><?= $count ?></div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <div class="chart-section">
            <h3>Browsers</h3>
            <div class="chart-container">
                <div class="bar-chart">
                    <?php 
                    $max_browser = max($browsers);
                    foreach (array_slice($browsers, 0, 5) as $browser => $count): 
                        $width = ($count / $max_browser) * 100;
                    ?>
                    <div class="bar-item">
                        <div class="bar-label"><?= htmlspecialchars($browser) ?></div>
                        <div class="bar" style="width: <?= $width %>%">
                            <div class="bar-value"><?= $count ?></div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <div class="recent-downloads">
            <h3>Recent Downloads (Last 20)</h3>
            <table class="download-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>OS</th>
                        <th>Browser</th>
                        <th>Source</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach (array_slice(array_reverse($downloads), 0, 20) as $download): ?>
                    <tr>
                        <td><?= date('M j, g:i A', strtotime($download['timestamp'])) ?></td>
                        <td><?= htmlspecialchars($download['os']) ?></td>
                        <td><?= htmlspecialchars($download['browser']) ?></td>
                        <td><?= htmlspecialchars($download['source']) ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php else: ?>
        <div class="chart-container" style="text-align: center; padding: 40px;">
            <h3>No downloads yet</h3>
            <p style="color: #a8a8ad;">Download data will appear here once people start downloading QuickLoops.</p>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>
