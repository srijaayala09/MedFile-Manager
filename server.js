const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cookieParser());
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.set('view engine', 'ejs');

// Create MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Srija@0903#1611',
  database: 'medical'
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fieldName = file.fieldname; // The fieldname such as prescriptions, medical_report, additional_documents
    cb(null, `${req.session.userId}-${fieldName}-${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.get('/', (req, res) => {
  res.redirect('/index');
});

// Routes for index Page
app.get('/index', (req, res) => {
  res.render('index', { error: null });
});

// Routes for registration page
app.get('/createprofile', (req, res) => {
  res.render('createprofile');
});

app.post('/createprofile', async (req, res) => {
  const { firstName, lastName, gender, dob, mobile, email, bloodGroup, emergencyContact, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const profileData = { firstName, lastName, gender, dob, mobile, email, bloodGroup, emergencyContact, password: hashedPassword };

  connection.query('INSERT INTO Profile SET ?', profileData, (error, results) => {
    if (error) {
      console.error('Error inserting profile data:', error);
      res.status(500).send('Error inserting profile data');
      return;
    }
    res.redirect('/index');
  });
});

// Routes for login page
app.get('/index', (req, res) => {
  res.render('index', { error: null });
});

app.post('/index', (req, res) => {
  const { email, password } = req.body;

  connection.query('SELECT * FROM Profile WHERE email = ?', [email], async (error, results) => {
    if (error) {
      console.error('Error fetching user:', error);
      res.render('index', { errorMessage: 'Error logging in' });
      return;
    }
    if (results.length === 0) {
      res.render('index', { errorMessage: 'Account doesn\'t exist. Please create one.' });
      return;
    }
    if (!(await bcrypt.compare(password, results[0].password))) {
      res.render('index', { errorMessage: 'Invalid password' });
      return;
    }
    req.session.userId = results[0].id;
    res.redirect('/home');
  });
});

// Routes for home page
app.get('/home', isAuthenticated, (req, res) => {
  res.render('home');
});

// Routes for profile page
app.get('/profile', isAuthenticated, (req, res) => {
  connection.query('SELECT * FROM Profile WHERE id = ?', [req.session.userId], (error, results) => {
    if (error) {
      console.error('Error fetching user details:', error);
      res.status(500).send('Error fetching user details');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('User not found');
      return;
    }
    res.render('profile', { user: results[0] });
  });
});

// Routes for form page
app.get('/form', isAuthenticated, (req, res) => {
  res.render('form');
});

app.post('/form', isAuthenticated, upload.fields([
  { name: 'prescriptions', maxCount: 1 },
  { name: 'medical_report', maxCount: 1 },
  { name: 'additional_documents', maxCount: 1 }
]), (req, res) => {
  const { consultation_date, hospital_name, doctor_name, doctor_specialisation, next_consultation_date } = req.body;
  const prescriptions = req.files['prescriptions'] ? req.files['prescriptions'][0].path : null;
  const medical_report = req.files['medical_report'] ? req.files['medical_report'][0].path : null;
  const additional_documents = req.files['additional_documents'] ? req.files['additional_documents'][0].path : null;

  if (!consultation_date || !hospital_name || !doctor_name || !doctor_specialisation || !prescriptions || !medical_report) {
    res.status(400).send('All mandatory fields must be filled.');
    return;
  }

  const sql = 'INSERT INTO consultation_records (user_id, consultation_date, hospital_name, doctor_name, doctor_specialisation, prescriptions, medical_report, next_consultation_date, additional_documents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [req.session.userId, consultation_date, hospital_name, doctor_name, doctor_specialisation, prescriptions, medical_report, next_consultation_date || null, additional_documents || null];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error inserting data:', err.stack);
      res.status(500).send('Error submitting form.');
      return;
    }
    res.render('success');
  });
});

// Routes for file page
app.get('/file', isAuthenticated, (req, res) => {
  const sql = 'SELECT * FROM consultation_records WHERE user_id = ?';
  connection.query(sql, [req.session.userId], (error, results) => {
    if (error) {
      console.error('Error fetching user files:', error);
      res.status(500).send('Error fetching user files');
      return;
    }
    res.render('file', { records: results });
  });
});

app.post('/profile', isAuthenticated, (req, res) => {
  const { firstName, lastName, gender, dob, mobile, email, bloodGroup, emergencyContact } = req.body;
  console.log(dob);
  // Validate and sanitize input data if necessary

  // Check if all required fields are present
  if (!firstName || !lastName || !gender || !dob || !mobile || !email || !bloodGroup || !emergencyContact) {
    return res.status(400).send('All fields are required.');
  }

  // Ensure the dob is in the correct format
  const formattedDob = new Date(dob).toISOString().split('T')[0];

  const sql = `
    UPDATE Profile 
    SET firstName = ?, lastName = ?, gender = ?, dob = ?, mobile = ?, email = ?, bloodGroup = ?, emergencyContact = ?
    WHERE id = ?
  `;
  const values = [firstName, lastName, gender, formattedDob, mobile, email, bloodGroup, emergencyContact, req.session.userId];

  connection.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error updating profile data:', error);
      return res.status(500).send('Error updating profile data');
    }

    // Redirect to the profile page to reflect changes
    res.redirect('/profile');
  });
});

app.post('/delete-file/:id', isAuthenticated, (req, res) => {
  const recordId = req.params.id;

  const sql = 'DELETE FROM consultation_records WHERE id = ?';
  connection.query(sql, [recordId], (error, results) => {
      if (error) {
          console.error('Error deleting record:', error);
          res.status(500).send('Error deleting record');
          return;
      }
      res.redirect('/file'); // Redirect to the page displaying the files
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/index');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:3000/`)
});
