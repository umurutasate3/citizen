const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
// const sendSMS = require('./sms/sendSMS'); // Assuming sendSMS is a separate module for sending SMS

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create a MySQL session store
const sessionStore = new MySQLStore({
  host: 'bwbusqyou6y36nq07nen-mysql.services.clever-cloud.com',
  port: 3306,
  user: 'ui5erqq1nmgauixl',
  password: 'am2w1jaNS2dIJMPwRZ0h',
  database: 'bwbusqyou6y36nq07nen'
});

// Initialize the session middleware with MySQLStore
app.use(session({
  secret: 'yourSecret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { maxAge: 60000 * 60 }  // Session expires in 1 hour
}));

// Create MySQL connection
const db = mysql.createConnection({
  host: 'bwbusqyou6y36nq07nen-mysql.services.clever-cloud.com',
  user: 'ui5erqq1nmgauixl',
  password: 'am2w1jaNS2dIJMPwRZ0h',
  database: 'bwbusqyou6y36nq07nen'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database.');
});

// Define the USSD Endpoint
app.post('/ussd', (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  const userResponse = text.split('*');

  let response = '';
  let language = '';

  if (text === '') {
    // Language selection screen
    response = 'CON Select language / Hitamo ururimi:\n';
    response += '1. English\n';
    response += '2. Kinyarwanda';
  } else if (userResponse[0] === '1' || userResponse[0] === '2') {
    // Set the language and ask the user what to do next
    language = userResponse[0] === '1' ? 'English' : 'Kinyarwanda';

    if (userResponse.length === 1) {
      if (language === 'English') {
        response = 'CON Welcome to Local Government Appointment Booking\n';
        response += '1. Book an appointment\n';
        response += '2. Exit';
      } else {
        response = 'CON Murakaza neza muri Serivisi y\'Ibyo Gahunda\n';
        response += '1. Guhitamo gahunda\n';
        response += '2. Gusohoka';
      }
    } else if (userResponse[1] === '1') {
      switch (userResponse.length) {
        case 2:
          // Ask for citizen's full name
          response = language === 'English' ? 'CON Enter your full name:' : 'CON Injiza amazina yawe yose:';
          break;
        case 3:
          // Ask for citizen's village
          req.session.fullName = userResponse[2]; // Save the user's full name
          response = language === 'English' ? 'CON Enter your village:' : 'CON Injiza umudugudu wawe:';
          break;
        case 4:
          // Ask for the reason for the appointment
          req.session.village = userResponse[3]; // Save the user's village
          response = language === 'English' ? 'CON Enter the reason for your appointment:' : 'CON Injiza impamvu y\'igikorwa cyawe:';
          break;
        case 5:
          // Fetch available slots from the database
          req.session.reason = userResponse[4]; // Save the user's reason

          // Perform async query to fetch available slots
          db.query('SELECT * FROM slots WHERE date >= CURDATE() AND availability = 1', (err, rows) => {
            if (err) {
              console.error(err);
              response = language === 'English' ? 'END Error fetching slots.' : 'END Ikibazo mu kubona amasaha.';
              return res.send(response);
            }

            if (rows.length === 0) {
              response = language === 'English' ? 'END No available slots at the moment.' : 'END Nta masaha aboneka muri iki gihe.';
              return res.send(response);
            }

            response = language === 'English' ? 'CON Available slots:\n' : 'CON Amasaha aboneka:\n';
            rows.forEach((slot, index) => {
              response += `${index + 1}. Date: ${slot.date.toISOString().split('T')[0]}, Time: ${slot.startTime} - ${slot.endTime}\n`;
            });
            response += language === 'English' ? 'Please select a slot by entering the number:\n' : 'Injiza umubare w\'amasaha ushyira mu bikorwa:\n';

            req.session.slots = rows;  // Save the slots in the session
            return res.send(response);  // Send response after the query completes
          });
          return;  // Exit case until the query finishes
        case 6:
          // Selecting a slot
          const selectedSlotIndex = parseInt(userResponse[5]) - 1; // Convert to index

          if (isNaN(selectedSlotIndex) || selectedSlotIndex < 0 || selectedSlotIndex >= req.session.slots.length) {
            response = language === 'English' ? 'END Invalid slot selection. Please try again.' : 'END Guhitamo ntabwo ari byo. Mugerageze nanone.';
            return res.send(response);
          }

          const selectedSlot = req.session.slots[selectedSlotIndex]; // Get selected slot

          // Insert the appointment data into MySQL
          const appointmentData = {
            username: req.session.fullName,
            village: req.session.village,
            phoneNumber,
            reason: req.session.reason,
            slotId: selectedSlot.id
          };

          const query = 'INSERT INTO appointments (username, village, phoneNumber, reason, slotId) VALUES (?, ?, ?, ?, ?)';
          db.query(query, Object.values(appointmentData), (err) => {
            if (err) {
              console.error(err);
              response = language === 'English' ? 'END Sorry, there was an error booking your appointment. Please try again later.' : 'END Twagize ikibazo mu kwemeza gahunda yawe. Mugerageze ubutaha.';
              return res.send(response);
            }

            // // Send confirmation SMS
            // const message = language === 'English'
            //   ? `Thank you ${req.session.fullName}! Your appointment is booked. Reason: ${req.session.reason}`
            //   : `Murakoze ${req.session.fullName}! Gahunda yawe yemejwe. Impamvu: ${req.session.reason}`;

            // sendSMS(phoneNumber, message)
            //   .then(result => console.log('SMS sent:', result))
            //   .catch(err => console.error('SMS sending error:', err));

            response = language === 'English'
              ? `END Thank you ${req.session.fullName}! Your appointment is booked. Reason: ${req.session.reason}`
              : `END Murakoze ${req.session.fullName}! Gahunda yawe yemejwe. Impamvu: ${req.session.reason}`;

            return res.send(response);
          });
          return;
        default:
          response = language === 'English' ? 'END Invalid input. Please try again.' : 'END Gusubiza ntabwo bikwiye. Mugerageze nanone.';
          break;
      }
    } else {
      // If user selects option 2 or enters any other response
      response = language === 'English' ? 'END Thank you for using our service. Goodbye!' : 'END Murakoze gukoresha serivisi yacu. Murabeho!';
    }
  } else {
    // Invalid selection
    response = 'END Invalid option. Please select a valid language option.';
  }

  // Send response back to the user
  res.send(response);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
