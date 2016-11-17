import axios from 'axios';

export var ajax = axios.create({
  baseURL: `http://localhost:8001/api/`,
  timeout: 30000
});