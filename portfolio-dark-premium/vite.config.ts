import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  // Le guide Elden Ring embarque son HTML d'origine (1,1 Mo, 150 Ko compressé), chargé seulement quand on ouvre le guide.
  build: { chunkSizeWarningLimit: 1300 },
})
