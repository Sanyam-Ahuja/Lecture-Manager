import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPlayer from 'react-player';
import './App.css';

function App() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [chapterProgress, setChapterProgress] = useState({ watchedProgress: 0, remainingProgress: 0 });
  const [subjectProgress, setSubjectProgress] = useState({ watchedProgress: 0, remainingProgress: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/subjects')
      .then(response => setSubjects(response.data))
      .catch(error => console.error(error));
  }, []);

  const fetchChapterDuration = (chapterId) => {
    return axios.get(`http://localhost:5000/api/chapters/${chapterId}/duration`)
      .then(response => {
        const { watched_duration, total_duration } = response.data;
        const watchedProgress = Math.round(((watched_duration / 60) / 60) * 100) / 100;
        const remainingProgress = Math.round(((total_duration - watched_duration) / 3600) * 100) / 100;
        setChapterProgress({ watchedProgress, remainingProgress });
        return { watchedProgress, remainingProgress };
      })
      .catch(error => {
        console.error(error);
        return { watchedProgress: 0, remainingProgress: 0 };
      });
  };

  const fetchChapters = (subjectId) => {
    axios.get(`http://localhost:5000/api/subjects/${subjectId}/chapters`)
      .then(response => {
        const chaptersData = response.data;

        const fetchRemainingTimes = chaptersData.map(chapter => fetchChapterDuration(chapter.id));

        Promise.all(fetchRemainingTimes)
          .then(chapterProgressData => {
            const updatedChapters = chaptersData.map((chapter, index) => ({
              ...chapter,
              completed: chapterProgressData[index].remainingProgress === 0
            }));
            setChapters(updatedChapters);
          });

        setSelectedSubject(subjectId);
        setSelectedChapter(null);
        setLectures([]);
        fetchSubjectDuration(subjectId);
      })
      .catch(error => console.error(error));
  };

  const fetchLectures = (chapterId) => {
    axios.get(`http://localhost:5000/api/chapters/${chapterId}/lectures`)
      .then(response => {
        setLectures(response.data);
        setSelectedChapter(chapterId);
        fetchChapterDuration(chapterId);
      })
      .catch(error => console.error(error));
  };

  const fetchSubjectDuration = (subjectId) => {
    axios.get(`http://localhost:5000/api/subjects/${subjectId}/duration`)
      .then(response => {
        const { watched_duration, total_duration } = response.data;
        const watchedProgress = Math.round(((watched_duration / 60) / 60) * 100) / 100;
        const remainingProgress = Math.round(((total_duration - watched_duration) / 3600) * 100) / 100;
        setSubjectProgress({ watchedProgress, remainingProgress });
      })
      .catch(error => console.error(error));
  };

  const toggleWatchedStatus = (lectureId) => {
    return axios.put(`http://localhost:5000/api/lectures/${lectureId}/toggle-watched`)
      .then(response => {
        setLectures(lectures.map(lecture =>
          lecture.id === lectureId ? { ...lecture, watched: response.data.watched } : lecture
        ));
        return response.data.watched;
      })
      .catch(error => {
        console.error(error);
        return null;
      });
  };

  const handleLectureClick = (lecture) => {
    setSelectedLecture(lecture);
  };

  const handleEnded = async () => {
    if (selectedLecture) {
      const watchedStatus = await toggleWatchedStatus(selectedLecture.id); // Mark as watched

      if (watchedStatus !== null) {
        const currentIndex = lectures.findIndex(lecture => lecture.id === selectedLecture.id);
        if (currentIndex !== -1 && currentIndex < lectures.length - 1) {
          const nextLecture = lectures[currentIndex + 1];
          setSelectedLecture(nextLecture);
        } else {
          setSelectedLecture(null); // No more lectures
        }
      }
    }
  };

  const handleError = (error) => {
    console.error("Error playing video:", error);
    alert("An error occurred while playing the video. Please try again later.");
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="app-container">
      <button className="dark-mode-toggle" onClick={toggleDarkMode}>
        {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </button>
      <h1 className="title">Study Manager</h1>
      <div className="subjects-container">
        {subjects.map(subject => (
          <div key={subject.id} className="subject-item">
            <button onClick={() => fetchChapters(subject.id)} className="subject-button">
              {subject.name}
            </button>
          </div>
        ))}
      </div>
      {selectedSubject && (
        <>
          <h2 className="section-title">Chapters</h2>
          <ul className="chapters-list">
            {chapters.map(chapter => (
              <li key={chapter.id} className={`chapter-item ${chapter.completed ? 'completed' : ''}`} onClick={() => fetchLectures(chapter.id)}>
                <span>{chapter.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {selectedChapter && (
        <div className="content-container">
          {selectedLecture && (
            <div className="video-player-container">
              <h2>{selectedLecture.name}</h2>
              <ReactPlayer
                url={`http://localhost:5000${selectedLecture.file_path}`}
                controls={true}
                width="100%"
                height="100%"
                onEnded={handleEnded}
                onError={handleError}
              />
            </div>
          )}
          <div className="lectures-container">
            <h2 className="section-title">Lectures</h2>
            <ul className="lectures-list">
              {lectures.map(lecture => (
                <li key={lecture.id} className={lecture.watched ? "lecture-item watched" : "lecture-item"} onClick={() => handleLectureClick(lecture)}>
                  {lecture.name} - {lecture.watched ? 'Watched' : 'Unwatched'}
                  <button onClick={() => toggleWatchedStatus(lecture.id)} className="watched-button">
                    Mark as {lecture.watched ? 'Unwatched' : 'Watched'}
                  </button>
                </li>
              ))}
            </ul>
            <h2>Chapter Progress</h2>
            <div>
              Watched Progress: {chapterProgress.watchedProgress}
            </div>
            <div>
              Remaining Progress: {chapterProgress.remainingProgress}
            </div>
          </div>
        </div>
      )}
      {selectedSubject && !selectedChapter && (
        <div className="progress-container">
          <h2 className="section-title">Subject Progress</h2>
          <div className="progress-bar">
            <div className="watched-progress">
              Watched: {subjectProgress.watchedProgress}
            </div>
            <div className="remaining-progress">
              Remaining: {subjectProgress.remainingProgress}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
