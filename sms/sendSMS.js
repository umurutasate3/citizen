const africastalking = require('africastalking');

// TODO: Initialize Africa's Talking

const africasTalking = africastalking({
    apiKey: 'atsk_d6ba7ffae0d99ba30acc28d795369eac314db7de2e359e890f7e5315cd339b556a19ef76',
    username:'sandbox'
});
module.exports = async function sendSMS(to,message) {
    
    // TODO: Send message

    try {
        const result = await africasTalking.SMS.send({
            to:to,
            message:message,
            from:'Kagarama cell'
        });
        console.log(result)
    } catch (ex) {
        console.log(ex);
    }

};