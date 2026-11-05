import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
  console.warn("VITE_API_BASE_URL is not set - API calls will fail");
}

const instance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
});

export default instance;
