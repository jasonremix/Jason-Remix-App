import { db, migrate } from './index.ts';

migrate();
console.log('Schema applied.');
db.close();
