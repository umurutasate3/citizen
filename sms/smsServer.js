const express = require('express');
const sendSMS = require('./sendSMS');

const app = express();


module.exports = function smsServer() {
    app.use(express.json());
    app.use(express.urlencoded({extended: false}));

    // TODO: Incoming messages route


    // TODO: Delivery reports route

};