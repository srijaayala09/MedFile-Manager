create DATABASE medical
use medical
CREATE TABLE Profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    dob DATE NOT NULL,
    mobile VARCHAR(10) NOT NULL,
    email VARCHAR(100) NOT NULL,
    bloodGroup VARCHAR(5) NOT NULL,
    emergencyContact VARCHAR(10) NOT NULL
);
ALTER TABLE Profile ADD COLUMN password VARCHAR(255) NOT NULL;

CREATE TABLE consultation_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    consultation_date DATE,
    hospital_name VARCHAR(255),
    doctor_name VARCHAR(255),
    doctor_specialisation VARCHAR(255),
    prescriptions TEXT,
    medical_report TEXT,
    next_consultation_date DATE,
    additional_documents TEXT
);
ALTER TABLE consultation_records
ADD COLUMN user_id INT,
ADD CONSTRAINT fk_user_id
    FOREIGN KEY (user_id)
    REFERENCES Profile(id);