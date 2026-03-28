import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // --- DATABASE REGISTRATION ---
  
  // Gets all registered databases (for the dropdown)
  getDatabases: async () => {
    const response = await apiClient.get('/databases');
    return response.data;
  },

  // Registers a new database target
  registerDatabase: async (dbConfig) => {
    const response = await apiClient.post('/databases', dbConfig);
    return response.data;
  },

  // --- BACKUP JOBS ---

  // Fetches all backup jobs for the table
  getBackups: async () => {
    const response = await apiClient.get('/backups');
    return response.data;
  },

  // Triggers a new asynchronous backup job
  triggerBackup: async (databaseConfigId, jobName) => {
    const response = await apiClient.post('/backups/trigger', {
      databaseConfigId,
      jobName
    });
    return response.data;
  },

  // Deletes a backup job and its associated local file
  deleteBackup: async (id) => {
    const response = await apiClient.delete(`/backups/${id}`);
    return response.data;
  },

  // --- DOWNLOAD ---

  // Triggers the browser's native download manager
  downloadBackup: (id) => {
    // We use window.location.assign because the backend sends 
    // Content-Disposition: attachment which triggers a download 
    // without leaving the current page.
    window.location.assign(`${API_BASE_URL}/backups/${id}/download`);
  }
};