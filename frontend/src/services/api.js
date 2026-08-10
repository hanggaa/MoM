import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept error responses to normalize messaging across components
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error details:', error);
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Unexpected networking error occurred.';
    
    return Promise.reject(new Error(errorMessage));
  }
);

export const checkHealth = () => api.get('/health');
export const getBYOKStatus = () => api.get('/settings/byok');
export const saveBYOKToken = (apiKey) => api.post('/settings/byok', { api_key: apiKey });

export const uploadAudioChunk = (formData, onUploadProgress) =>
  api.post('/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2-minute timeout per 25MB slice
    onUploadProgress,
  });

export const getTaskStatus = (taskId) => api.get(`/tasks/${taskId}`);
export const getMeetingDetails = (meetingId) => api.get(`/meetings/${meetingId}`);
export const synthesizeMeetingMoM = (meetingId, style) => api.post(`/meetings/${meetingId}/synthesize`, null, { params: { style }, timeout: 300000 });
export const getMeetingAudioUrl = (meetingId) => `/api/meetings/${meetingId}/audio`;

export const getSTTSettings = () => api.get('/settings/stt');
export const saveSTTSettings = (settings) => api.post('/settings/stt', settings);
export const listMeetings = (search) => api.get('/meetings', { params: { search: search || undefined } });
export const purgeMeetingAudio = (meetingId) => api.delete(`/meetings/${meetingId}/audio_only`);
export const deleteMeeting = (meetingId) => api.delete(`/meetings/${meetingId}`);

export default api;
