import dotenv from 'dotenv';
import path from 'path';

// Fix for import hoisting: Load env vars before anything else
dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
