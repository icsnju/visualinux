import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __rootdir = path.dirname(path.dirname(__filename));

dotenv.config({ path: path.join(__rootdir, '.env') });
dotenv.config({ path: path.join(__rootdir, '.env.local') });
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
