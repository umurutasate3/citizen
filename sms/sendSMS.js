const AfricasTalking = require('africastalking');

// TODO: Initialize Africa's Talking

const africastalking = AfricasTalking({
    apiKey:'atsk_d6ba7ffae0d99ba30acc28d795369eac314db7de2e359e890f7e5315cd339b556a19ef76',
    username: 'sandbox'
});

module.exports = async function sendSMS(to, message) {
    try {
      const result = await africastalking.SMS.send({
        to: [to], 
        message: message,
        from: ''
      });
      console.log(result);
      return result;
    } catch (ex) {
      console.error(ex);
      throw ex;
    }
  };