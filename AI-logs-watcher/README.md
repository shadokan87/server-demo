# AI Logs Watcher

An AI-powered log monitoring and alerting system that uses artificial intelligence to analyze log entries and send SMS notifications via Twilio when critical issues are detected.

## Features Status

### ✅ Available
- [x] 🤖 **AI-Powered Analysis**: Uses AI to intelligently analyze log entries and detect critical issues
- [x] 📱 **SMS Alerts**: Automatic SMS notifications via Twilio for critical and warning conditions
- [x] ⚡ **Real-time Monitoring**: Configurable polling intervals for continuous log analysis
- [x] 🎯 **Smart Detection**: Advanced keyword heuristics for detecting critical system failures
- [x] 📊 **Flexible Log Input**: Support for single logs, multi-line strings, or arrays of log entries
- [x] 🔧 **Highly Configurable**: Customizable AI models, polling intervals, and alert thresholds
#### Future
- [ ] 📞 **Voice Interactive Calling**: AI-powered voice calls for critical alerts with interactive responses
- [ ] 📋 **Phone Contacts Management**: Manage multiple contact lists with priority levels and escalation chains
- [ ] 🔄 **Alert Fallbacks**: Automatic fallback mechanisms when primary contacts are unavailable
- [ ] 📈 **Analytics Dashboard**: Real-time monitoring dashboard with alert history and trends

## Installation
```bash
npm install @shadokan87/ai-logs-watcher
```
## Quick Start

```typescript
import { Ailogw } from "./Ailogw/Ailogw";

const ailogwatch = new Ailogw({
    name: "vercel",
    twilio: {
        numberFrom: "+17153645914"
    },
    events: {
        async alert({ options, logs, diagnostic, sendSms }) {
            switch (diagnostic.raw.status) {
                case "warning":
                case "normal": {
                    await sendSms("+33727926138", diagnostic.formatted);
                    return;
                }
                case "critical": {
                    await sendSms("+33727926138", diagnostic.formatted);
                    return;
                }
            }
        }
    }
});

// Feed logs to be analyzed
ailogwatch.feedLog("2024-09-16 ERROR Database connection failed");
```

## Configuration

### Environment Variables

Set up your environment variables for Twilio and AI service:

```bash
# Required for SMS Demo (bun run demo:sms)
AILOGW_DEMO_NUMBER_TO="<destination_phone_number>"      # The phone number to send SMS alerts to
AILOGW_DEMO_NUMBER_FROM="<twilio_phone_number>"         # Your Twilio phone number (sender)

# Required for Twilio integration
AILOGW_TWILIO_ACCOUNT_SID="<your_twilio_account_sid>"
AILOGW_TWILIO_AUTH_TOKEN="<your_twilio_auth_token>"

# Required for ElevenLabs integration (if using voice features)
ELEVENLABS_API_KEY="<your_elevenlabs_api_key>"

# Optional: Blackbox API key (if using Blackbox features)
BLACKBOX_API_KEY="<your_blackbox_api_key>"

# Optional: Render real time logs
RT_RESOURCE="<your_render_resource>"
RT_OWNER_ID="<your_workspace_id>"
```

## Usage Examples

### Basic Log Monitoring

```typescript
const watcher = new Ailogw({
    name: "production-api",
    twilio: {
            numberFrom: "+17153645914"
    },
    events: {
        alert: async ({ options, logs, diagnostic, sendSms }) => {
            if (diagnostic.raw.status === "critical") {
                await sendSms("+1234567890", diagnostic.formatted);
            }
        }
    }
});

// Single log entry
watcher.feedLog("2024-09-16 10:30:25 ERROR Database connection failed");

// Multiple log entries
watcher.feedLog([
    "2024-09-16 10:30:25 INFO Server started",
    "2024-09-16 10:30:26 WARN High memory usage",
    "2024-09-16 10:30:27 CRITICAL System overload"
]);
```

### Custom Polling Configuration

```typescript
const watcher = new Ailogw({
    name: "database-logs",
    polling: {
        delay: "5:minutes",          // Check every 5 minutes
        tailAmount: 20               // Analyze last 20 log entries
    },
    events: {
        alert: async ({ options, logs, diagnostic, sendSms }) => {
            console.log(`Alert Status: ${diagnostic.raw.status}`);
            if (diagnostic.raw.topErrors) {
                console.log("Critical errors found:", diagnostic.raw.topErrors);
            }
        }
    }
});
```

### Advanced AI Configuration

```typescript
const watcher = new Ailogw({
    name: "advanced-monitoring",
    clientOptions: {
        baseURL: "https://api.blackbox.ai",
        apiKey: "sk-your-api-key"
    },
    modelSettings: {
        model: "gpt-4",
        temperature: 0.1
        // and any other openai compatible options
    },
    events: {
        alert: async ({ options, logs, diagnostic, sendSms }) => {
            // Custom alert logic
        }
    }
});
```

## Log Status Detection

The AI analyzes logs and categorizes them into three severity levels:

- **🟢 Normal**: Standard operation, no issues detected
- **🟡 Warning**: Potential issues that should be monitored
- **🔴 Critical**: Severe problems requiring immediate attention

### Critical Detection Keywords

The system automatically detects critical issues based on keywords such as:
- FATAL, PANIC, EMERGENCY, SEVERE
- OOM, OUT OF MEMORY, SEGFAULT
- CRASH, KERNEL PANIC, DATA LOSS
- SECURITY BREACH, DISK FAILURE
- SERVICE UNAVAILABLE, DEADLOCK
And any other words related to a critical issue

## Error Handling

The system includes built-in error handling for:
- Invalid config e.g credentials
- Invalid time units in polling configuration
- AI service connectivity issues
- SMS delivery failures

## API Reference

### Class Methods

#### `feedLog(log: string | string[])`
Feeds log entries to the watcher for analysis.

#### `activatePolling()`
Starts or resumes the log polling process.

#### `pausePolling()`
Pauses the log polling process.

#### `get options()`
Returns the current configuration options.

### Constructor Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `name*` | `string` | - | Unique identifier for this watcher instance |
| `twilio*` | `object` | `{}` | Twilio SMS configuration |
| `twilio.accountSid` | `string` | `process.env.AILOGW_TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `twilio.authToken` | `string` | `process.env.AILOGW_TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `twilio.numberFrom*` | `string` | `process.env.AILOGW_TWILIO_NUMBER_FROM` | Phone number purchased from Twilio (used as "from" number) |
| `activate` | `boolean` | `true` | Whether to automatically start polling when instance is created |
| `log` | `boolean` | `false` | Whether to enable console logging for this instance |
| `clientOptions` | `object` | `{}` | Configuration for the AI client (100% Openai compatible) |
| `modelSettings` | `object` | `{}` | AI model settings for log analysis (100% OpenAI compatible) |
| `modelSettings.model` | `string` | `"blackboxai/openai/gpt-4.1-mini"` | AI model to use |
| `modelSettings.stream` | `boolean` | `true` | Enable streaming responses |
| `modelSettings.temperature` | `number` | - | Model temperature setting |
| `polling` | `object` | `{}` | Polling configuration for log analysis |
| `polling.delay` | `string \| number` | `"10:minutes"` | Interval between log analysis cycles |
| `polling.tailAmount` | `number` | `10` | Number of recent log lines to analyze in each cycle |
| `events*` | `object` | - | Event handlers for different situations |
| `events.alert*` | `function` | - | Called when an alert is triggered by the AI analysis |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project license will be available soon.

## Support

For support and questions, please open an issue on the GitHub repository.
