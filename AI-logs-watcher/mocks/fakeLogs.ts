export const fakeLogs = `
2024-09-15 08:01:20 ERROR Database query timeout: SELECT * FROM large_table
2024-09-15 08:03:10 CRITICAL Database connection lost - attempting reconnection
2024-09-15 08:00:01 INFO Application server starting on port 3000
2024-09-15 08:00:02 INFO Database connection pool initialized with 10 connections
2024-09-15 08:00:03 INFO Redis cache connected successfully
2024-09-15 08:00:04 INFO JWT secret loaded from environment
2024-09-15 08:00:05 INFO Rate limiting configured: 100 requests per minute
2024-09-15 08:00:10 INFO First user request received: GET /api/health
2024-09-15 08:00:11 INFO Health check passed - all systems operational
2024-09-15 08:00:15 INFO User authentication successful for user_id: 1234
2024-09-15 08:00:20 INFO Processing payment for order_id: ORD-789012
2024-09-15 08:00:22 WARN Payment gateway response time: 2.3s (threshold: 2s)
2024-09-15 08:00:25 INFO Payment completed successfully
2024-09-15 08:00:30 INFO Email notification sent to user@example.com
2024-09-15 08:01:00 INFO Background job started: daily_report_generation
2024-09-15 08:01:05 WARN High memory usage detected: 78% of available RAM
2024-09-15 08:01:10 INFO Cache cleanup initiated to free memory
2024-09-15 08:01:15 INFO Memory usage reduced to 65%
2024-09-15 08:01:20 ERROR Database query timeout: SELECT * FROM large_table
2024-09-15 08:01:21 INFO Retrying database query with optimized parameters
2024-09-15 08:01:25 INFO Database query completed successfully
2024-09-15 08:01:30 INFO API request processed: POST /api/users
2024-09-15 08:02:00 WARN Unusual traffic pattern detected from IP: 192.168.1.100
2024-09-15 08:02:05 INFO Rate limit applied to suspicious IP
2024-09-15 08:02:10 INFO New user registration: user_id 5678
2024-09-15 08:02:15 INFO File upload started: document.pdf (2.5MB)
2024-09-15 08:02:20 INFO File upload completed and validated
2024-09-15 08:02:25 INFO Virus scan passed for uploaded file
2024-09-15 08:02:30 ERROR Failed to connect to external API: timeout after 30s
2024-09-15 08:02:32 WARN Falling back to cached data for external API response
2024-09-15 08:02:35 INFO External API fallback successful
2024-09-15 08:03:00 INFO Session expired for user_id: 9876
2024-09-15 08:03:05 INFO User logout processed successfully
2024-09-15 08:03:10 CRITICAL Database connection lost - attempting reconnection
2024-09-15 08:03:12 ERROR Database reconnection attempt 1 failed
2024-09-15 08:03:15 ERROR Database reconnection attempt 2 failed
2024-09-15 08:03:18 WARN Database reconnection attempt 3 in progress
2024-09-15 08:03:20 INFO Database connection restored successfully
2024-09-15 08:03:25 INFO All pending transactions resumed
2024-09-15 08:03:30 INFO System health check: all services operational
2024-09-15 08:04:00 WARN Disk space usage: 85% on /var/log partition
2024-09-15 08:04:05 INFO Log rotation initiated to free disk space
2024-09-15 08:04:10 INFO Old log files archived and compressed
2024-09-15 08:04:15 INFO Disk space usage reduced to 72%
2024-09-15 08:04:20 ERROR SSL certificate validation failed for external service
2024-09-15 08:04:22 CRITICAL Security alert: potential SSL attack detected
2024-09-15 08:04:25 INFO SSL connection terminated and logged
2024-09-15 08:04:30 INFO Alternative secure connection established
2024-09-15 08:05:00 INFO Scheduled backup process started
2024-09-15 08:05:05 INFO Database backup: 45% complete
2024-09-15 08:05:10 WARN Backup process slower than expected
2024-09-15 08:05:15 INFO Database backup completed successfully
2024-09-15 08:05:20 INFO Backup uploaded to cloud storage`.split('\n');
