import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import App from './App';

const mock = new MockAdapter(axios);

const subjects = [{ id: 1, name: 'Math' }];
const chapters = [{ id: 1, name: 'Chapter 1', subject_id: 1 }];
const lectures = [{ id: 1, name: 'Lecture 1', chapter_id: 1, watched: 0, file_path: '/lecture1.mp4' }];

mock.onGet('http://localhost:5000/api/subjects').reply(200, subjects);
mock.onGet('http://localhost:5000/api/subjects/1/chapters').reply(200, chapters);
mock.onGet('http://localhost:5000/api/chapters/1/lectures').reply(200, lectures);
mock.onPut('http://localhost:5000/api/lectures/1/toggle-watched').reply(200, { id: 1, watched: 1 });

test('renders subjects', async () => {
  render(<App />);
  await waitFor(() => screen.getByText('Math'));
  expect(screen.getByText('Math')).toBeInTheDocument();
});

test('fetches and displays chapters', async () => {
  render(<App />);
  await waitFor(() => screen.getByText('Math'));
  fireEvent.click(screen.getByText('Math'));
  await waitFor(() => screen.getByText('Chapter 1'));
  expect(screen.getByText('Chapter 1')).toBeInTheDocument();
});

test('fetches and displays lectures', async () => {
  render(<App />);
  await waitFor(() => screen.getByText('Math'));
  fireEvent.click(screen.getByText('Math'));
  await waitFor(() => screen.getByText('Chapter 1'));
  fireEvent.click(screen.getByText('Chapter 1'));
  await waitFor(() => screen.getByText('Lecture 1 - Unwatched'));
  expect(screen.getByText('Lecture 1 - Unwatched')).toBeInTheDocument();
});

test('marks lecture as watched on end', async () => {
  render(<App />);
  await waitFor(() => screen.getByText('Math'));
  fireEvent.click(screen.getByText('Math'));
  await waitFor(() => screen.getByText('Chapter 1'));
  fireEvent.click(screen.getByText('Chapter 1'));
  await waitFor(() => screen.getByText('Lecture 1 - Unwatched'));

  // Simulate ending the lecture
  const videoElement = screen.getByRole('button', { name: /play/i });
  fireEvent.click(videoElement); // Start the video
  fireEvent.pause(videoElement); // End the video

  await waitFor(() => screen.getByText('Lecture 1 - Watched'));
  expect(screen.getByText('Lecture 1 - Watched')).toBeInTheDocument();
});
