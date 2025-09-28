import twilio from 'twilio';
import 'dotenv/config';

// Twilio credentials from environment
const accountSid = process.env.AILOGW_TWILIO_ACCOUNT_SID;
const authToken = process.env.AILOGW_TWILIO_AUTH_TOKEN;
const fromNumber = process.env.AILOGW_DEMO_NUMBER_FROM;
const toNumber = process.env.AILOGW_DEMO_NUMBER_TO;

if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.error('Missing required environment variables:');
    console.error('AILOGW_TWILIO_ACCOUNT_SID:', !!accountSid);
    console.error('AILOGW_TWILIO_AUTH_TOKEN:', !!authToken);
    console.error('AILOGW_DEMO_NUMBER_FROM:', !!fromNumber);
    console.error('AILOGW_DEMO_NUMBER_TO:', !!toNumber);
    process.exit(1);
}

// Initialize Twilio client
const client = twilio(accountSid, authToken);

/**
 * Make a simple voice call with text-to-speech
 */
async function makeVoiceCall() {
    try {
        console.log(`Making voice call from ${fromNumber} to ${toNumber}...`);
        
        const call = await client.calls.create({
            from: fromNumber!,
            to: toNumber!,
            // Simple TwiML for text-to-speech
            twiml: `
                <Response>
                    <Say voice="alice">
                        Hello! This is a test call from your AI Logs Watcher system. 
                        A critical alert has been detected in your application logs. 
                        Please check your monitoring dashboard immediately.
                    </Say>
                    <Pause length="1"/>
                    <Say voice="alice">
                        Press any key to acknowledge this alert, or hang up to escalate to the next contact.
                    </Say>
                    <Gather input="dtmf" timeout="10" numDigits="1">
                        <Say voice="alice">Waiting for your input...</Say>
                    </Gather>
                    <Say voice="alice">
                        No input received. This alert will be escalated. Goodbye.
                    </Say>
                </Response>
            `
        });

        console.log('✅ Call initiated successfully!');
        console.log('Call SID:', call.sid);
        console.log('Call Status:', call.status);
        console.log('From:', call.from);
        console.log('To:', call.to);
        
        return call;
    } catch (error) {
        console.error('❌ Error making voice call:', error);
        throw error;
    }
}

/**
 * Make a voice call with a webhook URL for interactive responses
 */
async function makeInteractiveVoiceCall(webhookUrl: string) {
    try {
        console.log(`Making interactive voice call from ${fromNumber} to ${toNumber}...`);
        
        const call = await client.calls.create({
            from: fromNumber!,
            to: toNumber!,
            url: webhookUrl, // Your webhook URL for handling call events
            method: 'POST'
        });

        console.log('✅ Interactive call initiated successfully!');
        console.log('Call SID:', call.sid);
        console.log('Webhook URL:', webhookUrl);
        
        return call;
    } catch (error) {
        console.error('❌ Error making interactive voice call:', error);
        throw error;
    }
}

/**
 * Check call status
 */
async function checkCallStatus(callSid: string) {
    try {
        const call = await client.calls(callSid).fetch();
        
        console.log('📞 Call Status Update:');
        console.log('SID:', call.sid);
        console.log('Status:', call.status);
        console.log('Duration:', call.duration || 'N/A');
        console.log('Start Time:', call.startTime || 'N/A');
        console.log('End Time:', call.endTime || 'N/A');
        
        return call;
    } catch (error) {
        console.error('❌ Error fetching call status:', error);
        throw error;
    }
}

/**
 * Generate TwiML response for webhook handling
 */
function generateAlertTwiML(alertMessage: string, escalationNumber?: string) {
    const twiml = `
        <Response>
            <Say voice="alice">
                Critical Alert from AI Logs Watcher: ${alertMessage}
            </Say>
            <Pause length="1"/>
            <Gather input="dtmf" timeout="15" numDigits="1" action="/handle-response" method="POST">
                <Say voice="alice">
                    Press 1 to acknowledge this alert and mark it as handled.
                    Press 2 to get more details about the alert.
                    Press 9 to escalate to the on-call engineer.
                    Or stay on the line for automatic escalation.
                </Say>
            </Gather>
            ${escalationNumber ? `
            <Say voice="alice">
                No response received. Escalating to ${escalationNumber}. Goodbye.
            </Say>
            <Dial>${escalationNumber}</Dial>
            ` : `
            <Say voice="alice">
                No response received. Please check your monitoring dashboard. Goodbye.
            </Say>
            `}
        </Response>
    `;
    
    return twiml.trim();
}

// Main execution
async function main() {
    console.log('🚀 Twilio Voice Test Starting...\n');
    
    try {
        // Test 1: Simple voice call
        console.log('=== Test 1: Simple Voice Call ===');
        const call = await makeVoiceCall();
        
        // Wait a moment then check status
        console.log('\nWaiting 5 seconds before checking status...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await checkCallStatus(call.sid);
        
        console.log('\n=== Test 2: TwiML Generation ===');
        const twiml = generateAlertTwiML(
            "Database connection failed with 3 critical errors detected",
            "+1234567890"
        );
        console.log('Generated TwiML:');
        console.log(twiml);
        
        console.log('\n✅ Twilio Voice Test completed successfully!');
        console.log('\n📝 Next Steps:');
        console.log('1. Set up a webhook endpoint to handle interactive responses');
        console.log('2. Integrate this into your AI Logs Watcher alert system');
        console.log('3. Configure escalation chains and contact management');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Export functions for use in other modules
export {
    makeVoiceCall,
    makeInteractiveVoiceCall,
    checkCallStatus,
    generateAlertTwiML
};

// Run if this file is executed directly
if (import.meta.main) {
    main();
}
