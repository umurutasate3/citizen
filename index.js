const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Use promise-based MySQL for async/await
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create MySQL connection
const dbConnection = mysql.createPool({
    host: 'bwbusqyou6y36nq07nen-mysql.services.clever-cloud.com',
    user: 'ui5erqq1nmgauixl',
    password: 'am2w1jaNS2dIJMPwRZ0h',
    database: 'bwbusqyou6y36nq07nen'
});

app.post('/ussd', async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  const userResponse = text.split('*');
  let response = '';
  let language = '';
  let slots = [];
  let selectedSlotIndex = -1; // Initialize selectedSlotIndex

  // Check if the user input is empty
  if (text === '') {
      response = 'CON Select language / Hitamo ururimi:\n1. English\n2. Kinyarwanda';
  } else if (userResponse[0] === '1' || userResponse[0] === '2') {
      // Determine the language
      language = userResponse[0] === '1' ? 'English' : 'Kinyarwanda';

      // Main menu
      if (userResponse.length === 1) {
          response = language === 'English'
              ? 'CON Welcome to Local Government Appointment Booking\n1. Book an appointment\n2. Exit'
              : 'CON Murakaza neza muri Serivisi y\'Ibyo Gahunda\n1. Guhitamo gahunda\n2. Gusohoka';
      } else if (userResponse[1] === '1') {
          // Fetch available slots
          try {
              const [rows] = await dbConnection.query(`
                  SELECT id, date, startTime, endTime 
                  FROM slots 
                  WHERE availability = true AND date >= CURDATE()
              `);

              console.log('Fetched slots:', rows);

              if (rows.length === 0) {
                  response = language === 'English'
                      ? 'END No available slots for booking. Please try again later.'
                      : 'END Nta masaha aboneka yo guhitamo. Mugerageze ubutaha.';
              } else {
                  response = language === 'English' 
                      ? 'CON Available slots:\n' 
                      : 'CON Amasaha aboneka:\n';

                  // List available slots and store them
                  slots = rows; // Store the slots

                  rows.forEach((slot, index) => {
                      response += `${index + 1}. Date: ${slot.date.toISOString().split('T')[0]}, Time: ${slot.startTime} - ${slot.endTime}\n`;
                  });

                  response += language === 'English' 
                      ? 'Please select a slot by entering the number:\n' 
                      : 'Injiza umubare w\'amasaha ushyira mu bikorwa:\n';
              }
          } catch (error) {
              console.error('Error fetching slots:', error);
              response = language === 'English'
                  ? 'END Error fetching available slots. Please try again later.'
                  : 'END Twagize ikibazo mu kubona amasaha aboneka. Mugerageze ubutaha.';
          }
      } else if (userResponse.length === 2) {
          // Handle slot selection
          selectedSlotIndex = parseInt(userResponse[1]) - 1; // Get selected slot index

          // Check if the selected slot is valid
          if (selectedSlotIndex < 0 || selectedSlotIndex >= slots.length) {
              response = language === 'English'
                  ? 'END Invalid slot selection. Please try again.'
                  : 'END Guhitamo ntabwo bikwiye. Mugerageze nanone.';
          } else {
              // Proceed to ask for user details
              response = language === 'English' 
                  ? `CON You've selected ${slots[selectedSlotIndex].date.toISOString().split('T')[0]} from ${slots[selectedSlotIndex].startTime} to ${slots[selectedSlotIndex].endTime}. Enter your full name:` 
                  : `CON Wahisemo ${slots[selectedSlotIndex].date.toISOString().split('T')[0]} kuva ${slots[selectedSlotIndex].startTime} kugeza ${slots[selectedSlotIndex].endTime}. Injiza amazina yawe yose:`;
          }
      } else if (userResponse.length === 3) {
          // Capture user's full name
          const fullName = userResponse[2];

          response = language === 'English' 
              ? `CON Thank you, ${fullName}. Please enter your reason for the appointment:` 
              : `CON Murakoze, ${fullName}. Injiza impamvu ya gahunda:`;
      } else if (userResponse.length === 4) {
          // Capture reason and proceed with appointment creation
          const reason = userResponse[3];
          const selectedSlot = slots[selectedSlotIndex];

          // Insert appointment into the database
          try {
              await dbConnection.query(`
                  INSERT INTO appointments (appointmentDate, status, username, village, phoneNumber, reason) 
                  VALUES (?, 'pending', ?, ?, ?, ?)
              `, [selectedSlot.date.toISOString().split('T')[0], fullName, 'Unknown Village', phoneNumber, reason]); // Replace 'Unknown Village' with actual data if available

              response = language === 'English'
                  ? `END Appointment booked successfully for ${fullName} on ${selectedSlot.date.toISOString().split('T')[0]} at ${selectedSlot.startTime}.`
                  : `END Gahunda yawe yemejwe neza kuri ${fullName} kuri ${selectedSlot.date.toISOString().split('T')[0]} saa ${selectedSlot.startTime}.`;
          } catch (error) {
              console.error('Error booking appointment:', error);
              response = language === 'English'
                  ? 'END Error booking appointment. Please try again later.'
                  : 'END Twagize ikibazo mu kwemeza gahunda. Mugerageze ubutaha.';
          }
      }
  }

  // Respond back to the user
  res.send(response);
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
