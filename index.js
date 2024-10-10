const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create MySQL connection
const db = mysql.createConnection({
  host: 'bwbusqyou6y36nq07nen-mysql.services.clever-cloud.com', // Your MySQL host
  user: 'ui5erqq1nmgauixl', // Your MySQL username
  password: 'am2w1jaNS2dIJMPwRZ0h', // Your MySQL password
  database: 'bwbusqyou6y36nq07nen' // Your MySQL database
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database.');
});

// Function to convert 12-hour time format (e.g., "10:00 AM") to 24-hour format (e.g., "10:00:00")
const convertTo24Hour = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }

  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }

  return `${hours}:${minutes}:00`;
};

// Define the USSD Endpoint
app.get('/', (req, res) => {
  res.send('hello from api!');
});

app.post('/ussd', (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  // Split the input text into a list
  const userResponse = text.split('*');

  // Determine USSD flow based on user response
  let response = '';
  let language = '';  // to store the language selection

  if (text === '') {
    // Language selection screen
    response = 'CON Select language / Hitamo ururimi:\n';
    response += '1. English\n';
    response += '2. Kinyarwanda';
  } else if (userResponse[0] === '1' || userResponse[0] === '2') {
    // Set the language and ask the user what to do next
    language = userResponse[0] === '1' ? 'English' : 'Kinyarwanda';

    // Continue with main menu in the selected language
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
          // Ask for preferred date of appointment
          response = language === 'English'
            ? `CON Hi ${userResponse[2]}, please enter your preferred date (e.g., 2024-10-15):`
            : `CON Muraho ${userResponse[2]}, injiza itariki wifuza (nko 2024-10-15):`;
          break;
        case 4:
          // Ask for preferred time
          response = language === 'English'
            ? 'CON Enter preferred time (e.g., 10:00 AM):'
            : 'CON Injiza isaha wifuza (nko 10:00 AM):';
          break;
        case 5:
          // Ask for reason for appointment
          response = language === 'English'
            ? 'CON Enter reason for the appointment:'
            : 'CON Injiza impamvu ya gahunda:';
          break;
        case 6:
          // Convert the time to 24-hour format
          const appointmentTime = convertTo24Hour(userResponse[4]);

          // Save appointment details to MySQL
          const appointmentData = {
            phone_number: phoneNumber,
            full_name: userResponse[2],
            date: userResponse[3],
            time: appointmentTime,
            reason: userResponse[5],
          };

          // Insert the appointment data into MySQL
          const query = 'INSERT INTO appointments (phone_number, full_name, date, time, reason) VALUES (?, ?, ?, ?, ?)';
          db.query(query, Object.values(appointmentData), (err, result) => {
            if (err) {
              console.error(err);
              response = language === 'English'
                ? 'END Sorry, there was an error booking your appointment. Please try again later.'
                : 'END Twagize ikibazo mu kwemeza gahunda yawe. Mugerageze ubutaha.';
              res.send(response);
              return;
            }

            response = language === 'English'
              ? `END Thank you ${userResponse[2]}! Your appointment is booked for ${userResponse[3]} at ${userResponse[4]}.`
              : `END Murakoze ${userResponse[2]}! Gahunda yawe yemejwe kuri ${userResponse[3]} saa ${userResponse[4]}.`;
            res.send(response);
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
