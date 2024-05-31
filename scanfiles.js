const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = 5000;
const LECTURES_DIR = '//lectures'; // Update this path to your lectures directory

app.use(bodyParser.json());
app.use(cors());

const db = new sqlite3.Database('./study-manager.db');

// Initialize database schema
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS Subjects (id INTEGER PRIMARY KEY, name TEXT UNIQUE)");
  db.run("CREATE TABLE IF NOT EXISTS Chapters (id INTEGER PRIMARY KEY, subject_id INTEGER, name TEXT, FOREIGN KEY(subject_id) REFERENCES Subjects(id), UNIQUE(subject_id, name))");
  db.run("CREATE TABLE IF NOT EXISTS Lectures (id INTEGER PRIMARY KEY, chapter_id INTEGER, name TEXT, file_path TEXT, watched INTEGER, duration INTEGER, FOREIGN KEY(chapter_id) REFERENCES Chapters(id), UNIQUE(chapter_id, name))");
});

function getLectureDuration(filePath) {
  try {
    const duration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' });
    return parseFloat(duration.trim());
  } catch (error) {
    console.error('Error getting lecture duration:', error);
    return 0; // Return 0 if duration cannot be extracted
  }
}

function processLectures(chapterPath, chapterId) {
  fs.readdir(chapterPath, (err, lectures) => {
    if (err) {
      console.error('Error reading lectures directory:', err);
      return;
    }

    lectures.forEach(lecture => {
      const lecturePath = path.join(chapterPath, lecture);
      if (fs.lstatSync(lecturePath).isFile() && path.extname(lecture) === '.mp4') {
        const lectureDuration = getLectureDuration(lecturePath);
        db.get("SELECT id FROM Lectures WHERE chapter_id = ? AND name = ?", [chapterId, lecture], (err, row) => {
          if (err) {
            console.error('Error querying lecture:', err);
            return;
          }
          if (!row) {
            db.run("INSERT INTO Lectures (chapter_id, name, file_path, watched, duration) VALUES (?, ?, ?, ?, ?)", [chapterId, lecture, lecturePath, 0, lectureDuration], function (err) {
              if (err) {
                console.error('Error inserting lecture:', err);
              }
            });
          }
        });
      }
    });
  });
}

function scanAndPopulateDatabase(dir) {
  fs.readdir(dir, (err, subjects) => {
    if (err) {
      console.error('Error reading subjects directory:', err);
      return;
    }

    subjects.forEach(subject => {
      const subjectPath = path.join(dir, subject);
      if (fs.lstatSync(subjectPath).isDirectory()) {
        db.get("SELECT id FROM Subjects WHERE name = ?", [subject], (err, row) => {
          if (err) {
            console.error('Error querying subject:', err);
            return;
          }
          if (!row) {
            db.run("INSERT INTO Subjects (name) VALUES (?)", [subject], function (err) {
              if (err) {
                console.error('Error inserting subject:', err);
                return;
              }
              const subjectId = this.lastID;
              processChapters(subjectPath, subjectId);
            });
          } else {
            processChapters(subjectPath, row.id);
          }
        });
      }
    });
  });
}

function processChapters(subjectPath, subjectId) {
  fs.readdir(subjectPath, (err, chapters) => {
    if (err) {
      console.error('Error reading chapters directory:', err);
      return;
    }

    chapters.forEach(chapter => {
      const chapterPath = path.join(subjectPath, chapter);
      if (fs.lstatSync(chapterPath).isDirectory()) {
        db.get("SELECT id FROM Chapters WHERE subject_id = ? AND name = ?", [subjectId, chapter], (err, row) => {
          if (err) {
            console.error('Error querying chapter:', err);
            return;
          }
          if (!row) {
            db.run("INSERT INTO Chapters (subject_id, name) VALUES (?, ?)", [subjectId, chapter], function (err) {
              if (err) {
                console.error('Error inserting chapter:', err);
                return;
              }
              const chapterId = this.lastID;
              processLectures(chapterPath, chapterId);
            });
          } else {
            processLectures(chapterPath, row.id);
          }
        });
      }
    });
  });
}

// Scan the directory and populate the database
scanAndPopulateDatabase(LECTURES_DIR);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
